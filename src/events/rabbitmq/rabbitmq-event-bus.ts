import { Injectable, Logger, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ExternalContextCreator } from '@nestjs/core/helpers/external-context-creator';
import type amqplib from 'amqplib';
import { ConfirmChannel, Options } from 'amqplib';
import { AMQP_CONTEXT_TYPE, EVENT_HANDLER_METHOD_NAME } from '../../constants';
import { EVENTS_HANDLER_METADATA } from '../../constants/reflect-keys.constants';
import { InjectEventBusConfig } from '../../decorators/inject-event-bus-config.decorator';
import { EventBusNotInitializedException } from '../../exceptions/events/event-bus-not-initialized.exception';
import { UnregisteredEventHandlerMetadataException } from '../../exceptions/events/unregistered-event-handler-metadata.exception';
import { WrongEventHandlerMetadataException } from '../../exceptions/events/wrong-event-handler-metadata.exception';
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
	/** Dead letter exchange name */
	private _deadLetterExchange: string;
	/** Retry exchange name */
	private _retryExchange: string;
	/** Dead letter queue name */
	private _deadLetterQueue: string;
	/** Retry queue name */
	private _retryQueue: string;
	/** Application prefix */
	private _prefix: string;

	/**
	 * Creates a new command bus
	 * @param moduleRef Nest module providers
	 */
	constructor(
		private readonly moduleRef: ModuleRef,
		@InjectEventBusConfig()
		private readonly config: RabbitMQModuleConfig,
		private readonly externalContextCreator: ExternalContextCreator
	) {}

	//#region Public methods

	/**
	 * Initialices RabbitMQ connection, setups exchanges, dead letter queue and error queue
	 */
	public async initialize(): Promise<void> {
		const { prefix, retryTtl } = this.config;

		this.setExchangeAndQueueNames(prefix);

		const rabbitConfig = this.getRabbitMQConfig();
		await this.initConnection(rabbitConfig);

		await this.bindDefaultQueues(retryTtl);

		this._initialized = true;
	}

	/**
	 * Registers an event handler
	 * @param eventHandler Event handler
	 */
	public async register(eventHandler: Type<IEventHandler>): Promise<void> {
		if (!this.isConnectionInitialized)
			throw new EventBusNotInitializedException();

		const instance = this.moduleRef.get(eventHandler, { strict: false });
		if (!instance) {
			Logger.warn(
				`Not found instance for ${eventHandler.name}`,
				RabbitEventBus.name
			);
			return;
		}

		const metadata = this.reflectHandlerMetadata(eventHandler);
		if (!metadata)
			throw new UnregisteredEventHandlerMetadataException(eventHandler.name);

		const { eventPrefix, eventName, actionName } = metadata;
		if (!eventPrefix || !eventName || !actionName)
			throw new WrongEventHandlerMetadataException(eventHandler.name);

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

		const handler = this.externalContextCreator.create(
			instance,
			instance.handle,
			EVENT_HANDLER_METHOD_NAME,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			AMQP_CONTEXT_TYPE
		);

		await this._amqpConnection.createSubscriber(handler, messageOptions);
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
		if (!this.isConnectionInitialized)
			throw new EventBusNotInitializedException();

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

	/**
	 * Closes managed connection to RabbitMQ
	 */
	public async closeConnection(): Promise<void> {
		if (this._initialized) await this._amqpConnection.managedConnection.close();
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
		this._prefix = prefix;

		// Exchanges
		this._domainExchange = `${prefix}_domain_exchange`;
		this._deadLetterExchange = `${prefix}_dead_letter_exchange`;
		this._retryExchange = `${prefix}_retry_exchange`;

		// Queues
		this._deadLetterQueue = `${prefix}_dead_letter_queue`;
		this._retryQueue = `${prefix}_retry_queue`;
	}

	/**
	 * Gets a full RabbitMQ config from a partial module config
	 * @returns Full RabbitMQ config
	 */
	private getRabbitMQConfig(): RabbitMQConfig {
		const defaultExchangeOptions: Options.AssertExchange = {
			durable: true,
			autoDelete: false,
		};

		return {
			...this.config,
			errorHandler: this.errorHandler.bind(this),
			exchanges: [
				{
					name: this._domainExchange,
					type: 'topic',
					options: defaultExchangeOptions,
				},
				{
					name: this._retryExchange,
					type: 'fanout',
					options: defaultExchangeOptions,
				},
				{
					name: this._deadLetterExchange,
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
	 * Creates retry and dead letter exchanges and queues
	 * @param retryTtl TTL for retries
	 */
	private async bindDefaultQueues(retryTtl: number): Promise<void> {
		await this._amqpConnection.managedChannel.addSetup(
			async (channel: ConfirmChannel) => {
				// Retry
				await channel.assertQueue(this._retryQueue, {
					deadLetterExchange: this._domainExchange,
					messageTtl: retryTtl,
				});
				channel.bindQueue(this._retryQueue, this._retryExchange, '#');

				// Dead letter
				await channel.assertQueue(this._deadLetterQueue);
				channel.bindQueue(this._deadLetterQueue, this._deadLetterExchange, '#');
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
			queueName: `${this._prefix}-${eventPrefix}-${eventName}-${actionName}`,
			routingKey: eventName,
			retryRoutingKey: `retry-${this._prefix}-${eventPrefix}-${eventName}-${actionName}`,
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
			queueName,
			queueOptions: {
				deadLetterExchange: this._retryExchange,
				deadLetterRoutingKey: retryRoutingKey,
				durable: true,
				autoDelete: false,
			},
		};
	}

	private errorHandler(
		channel: amqplib.Channel,
		msg: amqplib.ConsumeMessage
	): void {
		const retries = Number(
			(msg.properties.headers['x-death'] &&
				msg.properties.headers['x-death'].find(
					item => item.exchange === this._domainExchange
				)?.count) ||
				0
		);

		if (retries >= this.config.maxRetries) {
			channel.publish(
				this._deadLetterExchange,
				msg.fields.routingKey,
				msg.content
			);
			return channel.ack(msg);
		} else {
			return channel.reject(msg, false);
		}
	}
}
