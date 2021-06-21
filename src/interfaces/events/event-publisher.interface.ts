import { AsyncEvent, SyncEvent } from '../../events';

/** Event publisher */
export interface IEventPublisher {
	/**
	 * Publish an event into corresponding event bus
	 * @param event Event
	 */
	publish(event: SyncEvent | AsyncEvent): Promise<void>;
	/**
	 * Publish many events into corresponding event bus
	 * @param events Events
	 */
	publishAll(events: Array<SyncEvent | AsyncEvent>): Promise<void>;
}
