import { COMMAND_HANDLER_METADATA } from '@Constants/reflect-keys.constants';
import { CommandHandlerNotFoundException } from '@Exceptions/command-not-found.exception';
import { InvalidCommandHandlerException } from '@Exceptions/invalid-command-handler.exception';
import { ICommandBus } from '@Interfaces/commands/command-bus.interface';
import { ICommandHandler } from '@Interfaces/commands/command-handler.interface';
import { ICommand } from '@Interfaces/commands/command.interface';
import { Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

/** Command handler class */
type CommandHandlerType = Type<ICommandHandler<ICommand>>;

/**
 *	Base command bus
 */
export abstract class BaseCommandBus<CommandBase extends ICommand = ICommand>
	implements ICommandBus<CommandBase> {
	/** Handlers binded to command bus */
	private _handlers = new Map<string, ICommandHandler<CommandBase>>();

	/**
	 * Creates a new command bus
	 * @param moduleRef Nest module providers
	 */
	constructor(protected readonly moduleRef: ModuleRef) {}

	/**
	 * Executes a command
	 * @param command Command
	 * @returns Command result
	 */
	abstract execute(command: CommandBase): Promise<any>;

	/**
	 * Bind a handler to command bus
	 * @param commandHandler Command handler
	 * @param commandName Command name
	 */
	bind(
		commandHandler: ICommandHandler<CommandBase>,
		commandName: string
	): void {
		this._handlers.set(commandName, commandHandler);
	}

	/**
	 * Binds an array of handlers
	 * @param handlers Handlers
	 */
	register(handlers: CommandHandlerType[] = []): void {
		handlers.forEach(handler => this.registerHandler(handler));
	}

	/**
	 * Gets command name from a command
	 * @param command Command
	 * @returns Command name
	 */
	protected getCommandName(command: CommandBase): string {
		return Object.getPrototypeOf(command).constructor.name as string;
	}

	/**
	 * Reflects command name from metadata
	 * @param handler Command handler
	 * @returns Command name
	 */
	protected reflectCommandName(handler: CommandHandlerType): string {
		const target: FunctionConstructor | undefined = Reflect.getMetadata(
			COMMAND_HANDLER_METADATA,
			handler
		);

		if (!target) throw new InvalidCommandHandlerException();

		return target.name;
	}

	/**
	 * Gets a command handler for a command
	 * @param command Command
	 * @returns Command handler
	 */
	protected getCommandHandler(
		command: CommandBase
	): ICommandHandler<CommandBase> {
		const commandName = this.getCommandName(command);
		const commandHandler = this._handlers.get(commandName);

		if (!commandHandler) throw new CommandHandlerNotFoundException(commandName);

		return commandHandler;
	}

	/**
	 * Registers a single handler to the command bus
	 * @param handler Command handler
	 */
	protected registerHandler(handler: CommandHandlerType): void {
		const instance = this.moduleRef.get(handler, { strict: false });
		if (!instance) return;

		const commandName = this.reflectCommandName(handler);
		this.bind(instance as ICommandHandler<CommandBase>, commandName);
	}
}
