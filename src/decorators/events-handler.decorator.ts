import { Type } from '@nestjs/common';
import { EVENTS_HANDLER_METADATA } from '../constants/reflect-keys.constants';
import { EventQueueOptions } from '../interfaces/events/event-queue-options';
import { IEvent } from '../interfaces/events/event.interface';

/**
 * Decorator that marks a class as a CQRS event handler. An event handler
 * handles events executed by your application code.
 *
 * The decorated class must implement the `IEventHandler` interface.
 *
 * @param events one or more event *types* to be handled by this handler.
 */
export const EventsHandler = (
	prefix: string,
	event: Type<IEvent>,
	action: Type<any>
): ClassDecorator => {
	return (target: object) => {
		Reflect.defineMetadata(
			EVENTS_HANDLER_METADATA,
			{
				queueName: `${prefix}-${event.name}-${action.name}`,
				routingKey: event.name,
				retryRoutingKey: `retry-${prefix}-${event.name}-${action.name}`,
			} as EventQueueOptions,
			target
		);
	};
};
