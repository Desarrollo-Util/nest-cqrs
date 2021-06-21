import { Type } from '@nestjs/common';
import { SyncEvent } from '../../events';
import { IEventHandler } from './event-handler.interface';

/** Event bus */
export interface ISyncEventBus {
	/**
	 * Register an event handler into event bus
	 * @param eventHandler Event handler
	 */
	register(eventHandler: Type<IEventHandler>): void;
	/**
	 * Register many event handlers into event bus
	 * @param eventHandlers Event handlers
	 */
	registerMany(eventHandlers: Type<IEventHandler>[]): void;
	/**
	 * Publish an event into event bus
	 * @param event Event
	 */
	publish(event: SyncEvent): Promise<void>;
	/**
	 * Publish many events into event bus
	 * @param events Events
	 */
	publishAll(events: SyncEvent[]): Promise<void>;
}
