import { IEvent } from '@Interfaces/events/event.interface';
import uuid from 'uuid-random';

/**
 * Event
 */
export abstract class Event<T> implements IEvent<T> {
	/** Event id*/
	public readonly id: string;
	/** Event created at date */
	public readonly ocurredOn: string;

	/**
	 * Creates a new event
	 * @param type Event type
	 * @param attributes Event attributes
	 */
	constructor(public readonly type: string, public readonly attributes: T) {
		this.id = uuid();
		this.ocurredOn = new Date().toUTCString();
	}
}
