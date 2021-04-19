import uuid from 'uuid-random';
import { IEvent } from '../interfaces/events/event.interface';

/**
 * Event
 */
export abstract class Event<T extends Record<string, any>>
	implements IEvent<T> {
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
