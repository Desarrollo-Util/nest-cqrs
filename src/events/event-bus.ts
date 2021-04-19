import { Injectable, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ConfirmChannel } from 'amqplib';
import { EVENTS_HANDLER_METADATA } from '../constants/reflect-keys.constants';
import { IEventBus } from '../interfaces/events/event-bus.interface';
import { IEventHandler } from '../interfaces/events/event-handler.interface';
import { EventQueueOptions } from '../interfaces/events/event-queue-options';
import { IEvent } from '../interfaces/events/event.interface';
import {
	RabbitMQConfig,
	RabbitMQModuleConfig,
} from '../interfaces/rabbitmq/rabbitmq-config.interface';
import { MessageHandlerOptions } from '../interfaces/rabbitmq/rabbitmq-message-handler-options.interface';
import { AmqpConnection } from './rabbitmq/amqp-connection';

@Injectable()
export class RabbitEventBus implements IEventBus {
	private _amqpConnection: AmqpConnection;
	private _domainExchange: string;
	private _errorExchange: string;
	private _deadLetterExchange: string;
	private _errorQueue: string;
	private _deadLetterQueue: string;
	private _prefix: string;

	/**
	 * Creates a new command bus
	 * @param moduleRef Nest module providers
	 */
	constructor(private readonly moduleRef: ModuleRef) {}

	private initConnection(partialConfig: RabbitMQModuleConfig): Promise<void> {
		this._domainExchange = `${partialConfig.prefix}_domain_exchange`;
		this._errorExchange = `${partialConfig.prefix}_error_exchange`;
		this._deadLetterExchange = `${partialConfig.prefix}_deadLetter_exchange`;
		this._prefix = partialConfig.prefix;

		const config: RabbitMQConfig = {
			...partialConfig,
			exchanges: [
				{
					name: this._domainExchange,
					type: 'topic',
					options: {
						durable: true,
						autoDelete: false,
					},
				},
				{
					name: this._deadLetterExchange,
					type: 'fanout',
					options: {
						durable: true,
						autoDelete: false,
					},
				},
				{
					name: this._errorExchange,
					type: 'fanout',
					options: {
						durable: true,
						autoDelete: false,
					},
				},
			],
		};
		this._amqpConnection = new AmqpConnection(config);
		return this._amqpConnection.init();
	}

	private bindQueues(
		prefix: string,
		deadLetterTtl: number,
		onConnectionClose: () => void
	): Promise<void> {
		this._errorQueue = `${prefix}_error_queue`;
		this._deadLetterQueue = `${prefix}_deadLetter_queue`;

		return this._amqpConnection.managedChannel.addSetup(
			async (channel: ConfirmChannel) => {
				await channel.assertQueue(this._deadLetterQueue, {
					deadLetterExchange: this._domainExchange,
					messageTtl: deadLetterTtl,
				});
				await channel.assertQueue(this._errorQueue);

				channel.bindQueue(this._deadLetterQueue, this._deadLetterExchange, '#');
				channel.bindQueue(this._errorQueue, this._errorExchange, '#');

				channel.once('close', onConnectionClose);
			}
		);
	}

	async initialize(partialConfig: RabbitMQModuleConfig): Promise<void> {
		await this.initConnection(partialConfig);
		return this.bindQueues(
			partialConfig.prefix,
			partialConfig.deadLetterTtl,
			partialConfig.onConnectionClose
		);
	}

	async register(eventHandler: Type<IEventHandler>): Promise<void> {
		const instance = this.moduleRef.get(eventHandler, { strict: false });
		if (!instance) return;

		await this._amqpConnection.createSubscriber(
			instance.handle.bind(instance),
			this.getMessagesOptions(eventHandler)
		);
	}

	async registerMany(eventHandlers: Type<IEventHandler>[]): Promise<void> {
		for (const eventHandler of eventHandlers) {
			await this.register(eventHandler);
		}
	}

	async publish(event: IEvent): Promise<void> {
		await this._amqpConnection.publish(
			this._domainExchange,
			event.constructor.name,
			{ ...event }
		);
	}

	async publishAll(events: IEvent[]): Promise<void> {
		for (const event of events) {
			await this.publish(event);
		}
	}

	private getMessagesOptions(
		eventHandler: Type<IEventHandler>
	): MessageHandlerOptions {
		const { queueName, routingKey, retryRoutingKey } = this.reflectRoutingKey(
			eventHandler
		);

		const routingKeyArray = [routingKey, retryRoutingKey];

		const messageHandlerOptions: MessageHandlerOptions = {
			exchange: this._domainExchange,
			routingKey: routingKeyArray,
			queue: queueName,
			queueOptions: {
				deadLetterExchange: this._deadLetterExchange,
				deadLetterRoutingKey: retryRoutingKey,
				durable: true,
				autoDelete: false,
			},
		};

		return messageHandlerOptions;
	}

	private reflectRoutingKey(
		eventHandler: Type<IEventHandler>
	): EventQueueOptions {
		const keys = Reflect.getMetadata(
			EVENTS_HANDLER_METADATA,
			eventHandler
		) as EventQueueOptions;
		// TODO: Error
		if (!keys) throw new Error('No hay evento chingue a su madre');

		return keys;
	}
}
