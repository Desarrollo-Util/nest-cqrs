import { EVENTS_HANDLER_METADATA } from '@Constants/reflect-keys.constants';
import { IEvent } from '@Interfaces/events/event.interface';
import { Type } from '@nestjs/common';
import 'reflect-metadata';

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
	event: Type<IEvent<any>>,
	action: Type<any>
): ClassDecorator => {
	return (target: object) => {
		Reflect.defineMetadata(
			EVENTS_HANDLER_METADATA,
			`${prefix}-${event.name}-${action.name}`,
			target
		);
	};
};
