import { CqrsException } from '../cqrs.exception';

/** Event handler metadata registered with an incorrect values */
export class WrongEventHandlerMetadataException extends CqrsException {
	/**
	 * Creates a new exception
	 * @param handlerName Event handler class name
	 */
	constructor(handlerName: string) {
		super(
			`Missing "eventPrefix", "eventName" or "actionName" metadata for ${handlerName} (check @EventHandler() decorator?)`
		);
	}
}
