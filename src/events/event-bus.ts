import { EVENTS_HANDLER_METADATA } from '@Constants/reflect-keys.constants';
import { IEventBus } from '@Interfaces/events/event-bus.interface';
import { IEventHandler } from '@Interfaces/events/event-handler.interface';
import { IEvent } from '@Interfaces/events/event.interface';
import { RabbitMQConfig } from '@Interfaces/rabbitmq/rabbitmq-config.interface';
import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import 'reflect-metadata';
import { AmqpConnection } from './rabbitmq/amqp-connection';

@Injectable()
export class RabbitEventBus implements IEventBus {
	private _amqpConnection: AmqpConnection;

	/**
	 * Creates a new command bus
	 * @param moduleRef Nest module providers
	 */
	constructor(private readonly moduleRef: ModuleRef) {}

	private initConnection(config: RabbitMQConfig): Promise<void> {
		this._amqpConnection = new AmqpConnection(config);
		return this._amqpConnection.init();
	}

	initialize(config: RabbitMQConfig): Promise<void> {
		return this.initConnection(config);
	}

	private reflectEventName(eventHandler: IEventHandler<IEvent<any>>): string {
		const eventName = Reflect.getMetadata(
			EVENTS_HANDLER_METADATA,
			eventHandler
		);
		// TODO: Error
		if (!eventName) throw new Error('No hay evento chingue a su madre');

		return eventName;
	}
}
