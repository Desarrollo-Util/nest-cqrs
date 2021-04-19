import { CqrsException } from './cqrs.exception';

/** Missing @EventsHandler() decorator */
export class InvalidEventsHandlerException extends CqrsException {
	/**
	 * Creates a new exception
	 */
	constructor() {
		super(
			`Invalid event handler exception (missing @EventsHandler() decorator?)`
		);
	}
}
