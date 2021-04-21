import { CqrsException } from '../cqrs.exception';

/** Command handler not found */
export class CommandHandlerNotFoundException extends CqrsException {
	/**
	 * Creates a new exception
	 * @param commandName Command name
	 */
	constructor(commandName: string) {
		super(
			`The command handler for the "${commandName}" command was not found!`
		);
	}
}
