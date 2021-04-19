import { IEvent } from './event.interface';

/** Event handler */
export interface IEventHandler<T extends IEvent<any> = IEvent<any>> {
	/**
	 * Handles an event
	 * @param event Event
	 */
	handle(event: T): Promise<void> | void;
}
