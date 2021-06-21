import { Type } from '@nestjs/common';
import { EVENTS_HANDLER_METADATA } from '../constants/reflect-keys.constants';
import { AsyncEvent, SyncEvent } from '../events';
import { UnrecognizedEventTypeException } from '../exceptions/events/unrecognized-event-type-registration.exception';
import {
	EventType,
	IEventMetadata,
} from '../interfaces/events/event-metadata.interface';
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
	let eventType: EventType;

	if (event.prototype instanceof SyncEvent) eventType = EventType.SYNC;
	else if (event.prototype instanceof AsyncEvent) eventType = EventType.ASYNC;
	else throw new UnrecognizedEventTypeException(event.name);

	const metadata: IEventMetadata = {
		eventType,
		eventPrefix: prefix,
		eventName: event.name,
		actionName: action.name,
	};

	return (target: object) => {
		Reflect.defineMetadata(EVENTS_HANDLER_METADATA, metadata, target);
	};
};
