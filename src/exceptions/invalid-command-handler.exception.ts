import { CqrsException } from './cqrs.exception';

/** Missing @CommandHandler() decorator */
export class InvalidCommandHandlerException extends CqrsException {
	/**
	 * Creates a new exception
	 */
	constructor() {
		super(
			`Invalid command handler exception (missing @CommandHandler() decorator?)`
		);
	}
}
