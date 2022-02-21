import uuid from 'uuid-random';
import { IEvent } from '../interfaces/events/event.interface';

/**
 * Asynchronous event
 */
export abstract class AsyncEvent<TAttributes extends Record<string, any> = any>
	implements IEvent<TAttributes>
{
	/** Event id*/
	public readonly id: string;
	/** Event created at date */
	public readonly ocurredOn: string;

	/**
	 * Creates a new event
	 * @param type Event type
	 * @param attributes Event attributes
	 */
	constructor(
		public readonly type: string,
		public readonly attributes: TAttributes
	) {
		this.id = uuid();
		this.ocurredOn = new Date().toUTCString();
	}
}
