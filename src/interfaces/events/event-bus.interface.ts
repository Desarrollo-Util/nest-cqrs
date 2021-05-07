import { Type } from '@nestjs/common';
import { IEvent } from '../../interfaces/events/event.interface';
import { IEventHandler } from './event-handler.interface';

/** Event bus */
export interface IEventBus {
	/**
	 * Initializes connection with event bus provider
	 * @param config Event bus provider config
	 */
	initialize(config?: any): Promise<void>;
	/**
	 * Register an event handler into event bus
	 * @param eventHandler Event handler
	 */
	register(eventHandler: Type<IEventHandler>): Promise<void>;
	/**
	 * Register many event handlers into event bus
	 * @param eventHandlers Event handlers
	 */
	registerMany(eventHandlers: Type<IEventHandler>[]): Promise<void>;
	/**
	 * Publish an event into event bus
	 * @param event Event
	 */
	publish(event: IEvent): Promise<void>;
	/**
	 * Publish many events into event bus
	 * @param events Events
	 */
	publishAll(events: IEvent[]): Promise<void>;
	/**
	 * Closes connection to event bus
	 */
	closeConnection(): Promise<void> | void;
}
