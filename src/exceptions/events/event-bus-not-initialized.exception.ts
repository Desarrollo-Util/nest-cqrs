import { CqrsException } from '../cqrs.exception';

/** Trying to register an event handler or publish a command without initialize connection  */
export class EventBusNotInitializedException extends CqrsException {
	/**
	 * Creates a new exception
	 */
	constructor() {
		super(
			'Event bus not initialized. You should call initialize() before register or publish'
		);
	}
}
