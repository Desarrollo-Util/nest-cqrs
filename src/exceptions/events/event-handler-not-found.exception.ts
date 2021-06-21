import { CqrsException } from '../cqrs.exception';

/** Event handler not found */
export class EventHandlerNotFoundException extends CqrsException {
	/**
	 * Creates a new exception
	 * @param eventName Event name
	 */
	constructor(eventName: string) {
		super(`The event handler for the "${eventName}" event was not found!`);
	}
}
