import { COMMAND_HANDLER_METADATA } from '@Constants/reflect-keys.constants';
import { ICommand } from '@Interfaces/commands/command.interface';
import 'reflect-metadata';

/**
 * Decorator that marks a class as a CQRS command handler. A command handler
 * handles commands (actions) executed by your application code.
 *
 * The decorated class must implement the `ICommandHandler` interface.
 *
 * @param command command *type* to be handled by this handler.
 */
export const CommandHandler = (command: ICommand): ClassDecorator => {
	return (target: object) => {
		Reflect.defineMetadata(COMMAND_HANDLER_METADATA, command, target);
	};
};
