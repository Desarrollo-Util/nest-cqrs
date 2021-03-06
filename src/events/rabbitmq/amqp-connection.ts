import { Logger } from '@nestjs/common';
import {
	AmqpConnectionManager,
	ChannelWrapper,
	connect,
} from 'amqp-connection-manager';
import {
	Channel,
	ConfirmChannel,
	Connection,
	ConsumeMessage,
	Options,
	Replies,
} from 'amqplib';
import {
	BehaviorSubject,
	EMPTY,
	lastValueFrom,
	Subject,
	throwError,
} from 'rxjs';
import { catchError, take, timeout } from 'rxjs/operators';
import { IEvent } from '../../interfaces/events/event.interface';
import {
	ConnectionInitOptions,
	RabbitMQConfig,
} from '../../interfaces/rabbitmq/rabbitmq-config.interface';
import { IRabbitMQMessageOptions } from '../../interfaces/rabbitmq/rabbitmq-message-options.interface';

export interface CorrelationMessage {
	correlationId: string;
	message: {};
}

const defaultConfig: Omit<RabbitMQConfig, 'uri'> = {
	prefetchCount: 5,
	defaultExchangeType: 'topic',
	exchanges: [],
	connectionInitOptions: {
		wait: true,
		timeout: 5000,
		reject: true,
	},
	connectionManagerOptions: {},
	errorHandler: (channel: Channel, msg: ConsumeMessage) => {
		channel.reject(msg, false);
	},
};

export class AmqpConnection {
	private readonly config: RabbitMQConfig;
	private readonly logger: Logger;
	private readonly initialized = new Subject<void>();
	private _managedConnection!: AmqpConnectionManager;
	private _managedChannel!: ChannelWrapper;
	private _channel?: Channel;
	private _connection?: Connection;
	private _consumeSubscriptions: Replies.Consume[] = [];
	public numEvents = new BehaviorSubject(0);

	constructor(config: RabbitMQConfig) {
		this.config = { ...defaultConfig, ...config };
		this.logger = new Logger(AmqpConnection.name);
	}

	get channel(): Channel {
		if (!this._channel) throw new Error('channel is not available');
		return this._channel;
	}

	get connection(): Connection {
		if (!this._connection) throw new Error('connection is not available');
		return this._connection;
	}

	get managedChannel(): ChannelWrapper {
		return this._managedChannel;
	}

	get managedConnection(): AmqpConnectionManager {
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

		const { wait, timeout: timeOut, reject } = options;

		this.initConnection();
		this.initChannel();
		const promise = this.setupInitChannel(this.config.onConnectionLost);
		if (!wait) return promise;

		return lastValueFrom(
			this.initialized.pipe(
				take(1),
				timeout({
					first: timeOut,
					with: () =>
						throwError(
							() =>
								new Error(
									`Failed to connect to a RabbitMQ broker within a timeout of ${timeout}ms`
								)
						),
				}),
				catchError(err => (reject ? throwError(err) : EMPTY))
			)
		);
	}

	/**
	 * Initializes RabbitMQ connection and adds connect listener
	 */
	private initConnection(): void {
		this.logger.log('Trying to connect to a RabbitMQ broker');

		this._managedConnection = connect(
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
	 * @param onConnectionClose Callback triggered when channel closes
	 */
	private async setupInitChannel(
		onConnectionClose?: () => void
	): Promise<void> {
		await this._managedChannel.addSetup(async (channel: ConfirmChannel) => {
			this._channel = channel;

			this.config.exchanges.forEach(async x =>
				channel.assertExchange(
					x.name,
					x.type || this.config.defaultExchangeType,
					x.options
				)
			);

			await channel.prefetch(this.config.prefetchCount);

			channel.once(
				'close',
				onConnectionClose
					? onConnectionClose
					: () => this.logger.log('Lost connection to RabbitMQ channel')
			);

			this.initialized.next();
		});
	}

	public async createSubscriber<T>(
		handler: (msg: T) => void | Promise<void>,
		msgOptions: IRabbitMQMessageOptions
	) {
		return this._managedChannel.addSetup(channel =>
			this.setupSubscriberChannel<T>(handler, msgOptions, channel)
		);
	}

	private async setupSubscriberChannel<T>(
		handler: (msg: T) => void | Promise<void>,
		msgOptions: IRabbitMQMessageOptions,
		channel: ConfirmChannel
	): Promise<void> {
		const { exchangeName: exchange, routingKey } = msgOptions;

		const { queue } = await channel.assertQueue(
			msgOptions.queueName,
			msgOptions.queueOptions || undefined
		);

		const routingKeys = Array.isArray(routingKey) ? routingKey : [routingKey];

		await Promise.all(
			routingKeys.map(x => channel.bindQueue(queue, exchange, x))
		);

		const tagConsumer = await channel.consume(queue, async msg => {
			let message: T;

			try {
				message = JSON.parse(msg.content.toString());
			} catch (e) {
				return;
			}

			this.numEvents.next(this.numEvents.value + 1);

			try {
				await handler(message);

				channel.ack(msg);
			} catch (e) {
				if (msgOptions.errorHandler) msgOptions.errorHandler(channel, msg, e);
				else this.config.errorHandler(channel, msg, e);
			} finally {
				this.numEvents.next(this.numEvents.value - 1);
			}
		});
		this._consumeSubscriptions.push(tagConsumer);
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
		options?: Options.Publish
	) {
		if (!this.managedConnection.isConnected() || !this._channel)
			throw new Error('AMQP connection is not available');

		let buffer: Buffer = message
			? Buffer.from(JSON.stringify(message))
			: Buffer.alloc(0);

		this._channel.publish(exchange, routingKey, buffer, options);
	}

	public async unsubcribeAll() {
		this.logger.log(`Unsubscribe to all queues...`);
		await Promise.all(
			this._consumeSubscriptions.map(sub =>
				this.channel.cancel(sub.consumerTag)
			)
		);
		this.logger.log(`Unsubscribe finish`);
	}
}
