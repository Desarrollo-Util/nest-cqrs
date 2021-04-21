import { CqrsException } from '../cqrs.exception';

/** Unregistered metadata for a command handler */
export class UnregisteredCommandHandlerException extends CqrsException {
	/**
	 * Creates a new exception
	 */
	constructor(commandName: string) {
		super(
			`Unregistered metadata for ${commandName} (missing @CommandHandler() decorator?)`
		);
	}
}
