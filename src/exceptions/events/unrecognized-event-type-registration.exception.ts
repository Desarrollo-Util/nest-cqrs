import { CqrsException } from '../cqrs.exception';

/** Trying to add metadata to am event handler with an incorrect event type */
export class UnrecognizedEventTypeException extends CqrsException {
	/**
	 * Creates a new exception
	 * @param eventName Event class name
	 */
	constructor(eventName: string) {
		super(
			`Unrecognized event type in @EventsHandler decorator for ${eventName} (missing extends from SyncEvent or AsyncEvent classes?)`
		);
	}
}
