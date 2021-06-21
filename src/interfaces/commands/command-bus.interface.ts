import { Type } from '@nestjs/common';
import { ICommandHandler } from './command-handler.interface';
import { ICommand } from './command.interface';

/**
 * Command bus
 */
export interface ICommandBus<T extends ICommand = ICommand> {
	/**
	 * Executes a command
	 * @param command Command
	 * @returns Command result
	 */
	execute(command: T): any;

	/**
	 * Binds an array of handlers
	 * @param handlers Handlers
	 */
	register(handlers: Type<ICommandHandler>[]): void;
}
