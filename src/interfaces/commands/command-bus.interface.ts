import { Type } from '@nestjs/common';
import { ICommandHandler } from './command-handler.interface';
import { ICommand } from './command.interface';

/** Command handler class */
type CommandHandlerType = Type<ICommandHandler<ICommand>>;

/** Command bus */
export interface ICommandBus<T extends ICommand = ICommand> {
	/**
	 * Executes a command
	 * @param command Command
	 * @returns Command result
	 */
	execute(command: T): any;

	/**
	 * Bind a handler to command bus
	 * @param commandHandler Command handler
	 * @param commandName Command name
	 */
	bind(commandHandler: ICommandHandler<T>, commandName: string): void;

	/**
	 * Binds an array of handlers
	 * @param handlers Handlers
	 */
	register(handlers: CommandHandlerType[]): void;
}
