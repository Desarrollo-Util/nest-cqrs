import { Injectable, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ConfirmChannel, Options } from 'amqplib';
import { EVENTS_HANDLER_METADATA } from '../../constants/reflect-keys.constants';
import { IEventBus } from '../../interfaces/events/event-bus.interface';
import { IEventHandler } from '../../interfaces/events/event-handler.interface';
import { IEventMetadata } from '../../interfaces/events/event-metadata.interface';
import { IEvent } from '../../interfaces/events/event.interface';
import { IRabbitMQBaseQueueOptions } from '../../interfaces/rabbitmq/rabbitmq-base-queue-options.interface';
import {
	RabbitMQConfig,
	RabbitMQModuleConfig,
} from '../../interfaces/rabbitmq/rabbitmq-config.interface';
import { IRabbitMQMessageOptions } from '../../interfaces/rabbitmq/rabbitmq-message-options.interface';
import { AmqpConnection } from './amqp-connection';

/**
 * Rabbit MQ event bus implementation
 */
@Injectable()
export class RabbitEventBus implements IEventBus {
	/** AMQP connection to RabbitMQ */
	private _amqpConnection: AmqpConnection;
	/** Is connection initialized */
	private _initialized: boolean = false;
	/** Domain exchange name */
	private _domainExchange: string;
	/** Error exchange name */
	private _errorExchange: string;
	/** Dead letter exchange name */
	private _deadLetterExchange: string;
	/** Error queue name */
	private _errorQueue: string;
	/** Dead letter queue name */
	private _deadLetterQueue: string;

	/**
	 * Creates a new command bus
	 * @param moduleRef Nest module providers
	 */
	constructor(private readonly moduleRef: ModuleRef) {}

	//#region Public methods

	/**
	 * Initialices RabbitMQ connection, setups exchanges, dead letter queue and error queue
	 * @param partialConfig Module config
	 */
	public async initialize(partialConfig: RabbitMQModuleConfig): Promise<void> {
		const { prefix, deadLetterTtl } = partialConfig;

		this.setExchangeAndQueueNames(prefix);

		const rabbitConfig = this.getRabbitMQConfig(partialConfig);
		await this.initConnection(rabbitConfig);

		await this.bindDefaultQueues(deadLetterTtl);

		this._initialized = true;
	}

	/**
	 * Registers an event handler
	 * @param eventHandler Event handler
	 */
	public async register(eventHandler: Type<IEventHandler>): Promise<void> {
		// TODO: Formatear los errores
		if (!this.isConnectionInitialized)
			throw new Error(
				'Trying to register an event handler without initialize connection'
			);

		const instance = this.moduleRef.get(eventHandler, { strict: false });
		if (!instance) return;

		const metadata = this.reflectHandlerMetadata(eventHandler);
		if (!metadata) throw new Error('Unregistered event handler');

		const { eventPrefix, eventName, actionName } = metadata;
		if (!eventPrefix || !eventName || !actionName)
			throw new Error('Bad registration of event handler');

		const {
			queueName,
			routingKey,
			retryRoutingKey,
		} = this.getQueueNameAndRoutingKeys(eventPrefix, eventName, actionName);

		const messageOptions = this.getMessageOptions(
			queueName,
			routingKey,
			retryRoutingKey
		);

		await this._amqpConnection.createSubscriber(
			instance.handle.bind(instance),
			messageOptions
		);
	}

	/**
	 * Registers an array of event handlers
	 * @param eventHandlers Event handler array
	 */
	public async registerMany(
		eventHandlers: Type<IEventHandler>[]
	): Promise<void> {
		for (const eventHandler of eventHandlers) {
			await this.register(eventHandler);
		}
	}

	/**
	 * Publishes an event to RabbitMQ
	 * @param event Event
	 */
	public async publish(event: IEvent): Promise<void> {
		// TODO: Formatear los errores
		if (!this.isConnectionInitialized)
			throw new Error(
				'Trying to publish an event without initialize connection'
			);

		await this._amqpConnection.publish(
			this._domainExchange,
			event.constructor.name,
			{ ...event }
		);
	}

	/**
	 * Publishes an array of events to RabbitMQ
	 * @param events Event array
	 */
	public async publishAll(events: IEvent[]): Promise<void> {
		for (const event of events) {
			await this.publish(event);
		}
	}

	//#endregion

	/**
	 * Is connection initialized
	 */
	get isConnectionInitialized(): boolean {
		return this._initialized;
	}

	/**
	 * Sets exchange and queue names based on a prefix string
	 * @param prefix Prefix
	 */
	private setExchangeAndQueueNames(prefix: string): void {
		// Exchanges
		this._domainExchange = `${prefix}_domain_exchange`;
		this._errorExchange = `${prefix}_error_exchange`;
		this._deadLetterExchange = `${prefix}_deadLetter_exchange`;

		// Queues
		this._errorQueue = `${prefix}_error_queue`;
		this._deadLetterQueue = `${prefix}_deadLetter_queue`;
	}

	/**
	 * Gets a full RabbitMQ config from a partial module config
	 * @param partialConfig Partial module config
	 * @returns Full RabbitMQ config
	 */
	private getRabbitMQConfig(
		partialConfig: RabbitMQModuleConfig
	): RabbitMQConfig {
		const defaultExchangeOptions: Options.AssertExchange = {
			durable: true,
			autoDelete: false,
		};

		return {
			...partialConfig,
			exchanges: [
				{
					name: this._domainExchange,
					type: 'topic',
					options: defaultExchangeOptions,
				},
				{
					name: this._deadLetterExchange,
					type: 'fanout',
					options: defaultExchangeOptions,
				},
				{
					name: this._errorExchange,
					type: 'fanout',
					options: defaultExchangeOptions,
				},
			],
		};
	}

	/**
	 * Inits RabbitMQ connection and channel
	 * @param config RabbitMQ config
	 */
	private async initConnection(config: RabbitMQConfig): Promise<void> {
		this._amqpConnection = new AmqpConnection(config);
		await this._amqpConnection.init();
	}

	/**
	 * Creates dead letter and error exchanges and queues
	 * @param deadLetterTtl Dead letter TTL for retries
	 */
	private async bindDefaultQueues(deadLetterTtl: number): Promise<void> {
		await this._amqpConnection.managedChannel.addSetup(
			async (channel: ConfirmChannel) => {
				// Dead letter
				await channel.assertQueue(this._deadLetterQueue, {
					deadLetterExchange: this._domainExchange,
					messageTtl: deadLetterTtl,
				});
				channel.bindQueue(this._deadLetterQueue, this._deadLetterExchange, '#');

				// Error
				await channel.assertQueue(this._errorQueue);
				channel.bindQueue(this._errorQueue, this._errorExchange, '#');
			}
		);
	}

	/**
	 * Reflects event handler metadata
	 * @param eventHandler Event handler
	 * @returns Event handler metadata
	 */
	private reflectHandlerMetadata(
		eventHandler: Type<IEventHandler>
	): IEventMetadata {
		return Reflect.getMetadata(
			EVENTS_HANDLER_METADATA,
			eventHandler
		) as IEventMetadata;
	}

	/**
	 * Gets queue name and routing keys from event handler metadata
	 * @param eventPrefix Event prefix
	 * @param eventName Event name
	 * @param actionName Action name
	 * @returns Queue name and routing keys
	 */
	private getQueueNameAndRoutingKeys(
		eventPrefix: string,
		eventName: string,
		actionName: string
	): IRabbitMQBaseQueueOptions {
		return {
			queueName: `${eventPrefix}-${eventName}-${actionName}`,
			routingKey: eventName,
			retryRoutingKey: `retry-${eventPrefix}-${eventName}-${actionName}`,
		};
	}

	/**
	 * Gets message options
	 * @param queueName Queue name
	 * @param routingKey Main routing key
	 * @param retryRoutingKey Retry routing key
	 * @returns Message options
	 */
	private getMessageOptions(
		queueName: string,
		routingKey: string,
		retryRoutingKey: string
	): IRabbitMQMessageOptions {
		const routingKeyArray = [routingKey, retryRoutingKey];

		return {
			exchangeName: this._domainExchange,
			routingKey: routingKeyArray,
			// TODO: Esto es necesario?
			queueName: queueName,
			queueOptions: {
				deadLetterExchange: this._deadLetterExchange,
				deadLetterRoutingKey: retryRoutingKey,
				durable: true,
				autoDelete: false,
			},
		};
	}
}
