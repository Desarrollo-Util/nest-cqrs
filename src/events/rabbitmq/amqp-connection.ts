import { Logger } from '@nestjs/common';
import amqpcon from 'amqp-connection-manager';
import amqplib from 'amqplib';
import { EMPTY, Subject, throwError } from 'rxjs';
import { catchError, take, timeoutWith } from 'rxjs/operators';
import { RabbitMQErrorHandlerTypes } from '../../constants/rabbitmq/rabbitmq-error-handler-types.enum';
import { IEvent } from '../../interfaces/events/event.interface';
import {
	ConnectionInitOptions,
	RabbitMQConfig,
} from '../../interfaces/rabbitmq/rabbitmq-config.interface';
import { MessageHandlerOptions } from '../../interfaces/rabbitmq/rabbitmq-message-handler-options.interface';

export interface CorrelationMessage {
	correlationId: string;
	message: {};
}

const defaultConfig: Omit<RabbitMQConfig, 'uri'> = {
	prefetchCount: 10,
	defaultExchangeType: 'topic',
	defaultSubscribeErrorBehavior: RabbitMQErrorHandlerTypes.REJECT,
	exchanges: [],
	connectionInitOptions: {
		wait: true,
		timeout: 5000,
		reject: true,
	},
	connectionManagerOptions: {},
};

export class AmqpConnection {
	private readonly config: RabbitMQConfig;
	private readonly logger: Logger;
	private readonly initialized = new Subject<void>();
	private _managedConnection!: amqpcon.AmqpConnectionManager;
	private _managedChannel!: amqpcon.ChannelWrapper;
	private _channel?: amqplib.Channel;
	private _connection?: amqplib.Connection;

	constructor(config: RabbitMQConfig) {
		this.config = { ...defaultConfig, ...config };
		this.logger = new Logger(AmqpConnection.name);
	}

	get channel(): amqplib.Channel {
		if (!this._channel) throw new Error('channel is not available');
		return this._channel;
	}

	get connection(): amqplib.Connection {
		if (!this._connection) throw new Error('connection is not available');
		return this._connection;
	}

	get managedChannel(): amqpcon.ChannelWrapper {
		return this._managedChannel;
	}

	get managedConnection(): amqpcon.AmqpConnectionManager {
		return this._managedConnection;
	}

	get configuration() {
		return this.config;
	}

	/**
	 * Initializes RabbitMQ, connects to channel and setup exchanges
	 */
	public async init(): Promise<void> {
		const options: ConnectionInitOptions = {
			...defaultConfig.connectionInitOptions,
			...this.config.connectionInitOptions,
		};

		const { wait, timeout, reject } = options;

		this.initConnection();
		this.initChannel();
		const promise = this.setupInitChannel();
		if (!wait) return promise;

		return this.initialized
			.pipe(
				take(1),
				timeoutWith(
					timeout,
					throwError(
						new Error(
							`Failed to connect to a RabbitMQ broker within a timeout of ${timeout}ms`
						)
					)
				),
				catchError(err => (reject ? throwError(err) : EMPTY))
			)
			.toPromise<void>();
	}

	/**
	 * Initializes RabbitMQ connection and adds connect listener
	 */
	private initConnection(): void {
		this.logger.log('Trying to connect to a RabbitMQ broker');

		this._managedConnection = amqpcon.connect(
			Array.isArray(this.config.uri) ? this.config.uri : [this.config.uri],
			this.config.connectionManagerOptions
		);

		this._managedConnection.on('connect', ({ connection }) => {
			this._connection = connection;
			this.logger.log('Successfully connected to a RabbitMQ broker');
		});
	}

	/**
	 * Initializes RabbitMQ channel and adds connect and error listeners
	 */
	private initChannel(): void {
		this._managedChannel = this._managedConnection.createChannel({
			name: AmqpConnection.name,
		});

		this._managedChannel.on('connect', () =>
			this.logger.log('Successfully connected a RabbitMQ channel')
		);

		this._managedChannel.on('error', (err, { name }) =>
			this.logger.log(
				`Failed to setup a RabbitMQ channel - name: ${name} / error: ${err.message} ${err.stack}`
			)
		);

		this._managedChannel.on('close', () =>
			this.logger.log('Successfully closed a RabbitMQ channel')
		);
	}

	/**
	 * Initializes channel exchanges and prefetch messages
	 */
	private async setupInitChannel(): Promise<void> {
		await this._managedChannel.addSetup(
			async (channel: amqplib.ConfirmChannel) => {
				this._channel = channel;

				this.config.exchanges.forEach(async x =>
					channel.assertExchange(
						x.name,
						x.type || this.config.defaultExchangeType,
						x.options
					)
				);

				await channel.prefetch(this.config.prefetchCount);

				this.initialized.next();
			}
		);
	}

	public async createSubscriber<T>(
		handler: (msg: T) => void | Promise<void>,
		msgOptions: MessageHandlerOptions
	) {
		return this._managedChannel.addSetup(channel =>
			this.setupSubscriberChannel<T>(handler, msgOptions, channel)
		);
	}

	private async setupSubscriberChannel<T>(
		handler: (msg: T) => void | Promise<void>,
		msgOptions: MessageHandlerOptions,
		channel: amqplib.ConfirmChannel
	): Promise<void> {
		const { exchange, routingKey } = msgOptions;

		const { queue } = await channel.assertQueue(
			msgOptions.queue || '',
			msgOptions.queueOptions || undefined
		);

		const routingKeys = Array.isArray(routingKey) ? routingKey : [routingKey];

		await Promise.all(
			routingKeys.map(x => channel.bindQueue(queue, exchange, x))
		);

		await channel.consume(queue, async msg => {
			let message: T;

			try {
				message = JSON.parse(msg.content.toString());
			} catch (e) {
				return;
			}

			try {
				await handler(message);

				channel.ack(msg);
			} catch (e) {
				console.log('ERROR', e);
				this.errorHandler(
					msgOptions.errorHandler || this.config.defaultSubscribeErrorBehavior,
					channel,
					msg
				);
			}
		});
	}

	private errorHandler(
		handlerType: RabbitMQErrorHandlerTypes,
		channel: amqplib.Channel,
		msg: amqplib.ConsumeMessage
	): void {
		switch (handlerType) {
			case RabbitMQErrorHandlerTypes.ACK:
				channel.ack(msg);
				return;
			case RabbitMQErrorHandlerTypes.NACK:
				channel.nack(msg, false, false);
				return;
			case RabbitMQErrorHandlerTypes.REQUEUE:
				channel.nack(msg, false, true);
				return;
			default:
				channel.reject(msg, false);
				return;
		}
	}

	/**
	 * Publish a message into a exchange
	 * @param exchange Exchange name
	 * @param routingKey Routing key
	 * @param message Message
	 * @param options Publish options
	 */
	public async publish(
		exchange: string,
		routingKey: string,
		message: IEvent,
		options?: amqplib.Options.Publish
	) {
		if (!this.managedConnection.isConnected() || !this._channel)
			throw new Error('AMQP connection is not available');

		let buffer: Buffer = message
			? Buffer.from(JSON.stringify(message))
			: Buffer.alloc(0);

		this._channel.publish(exchange, routingKey, buffer, options);
	}
}
