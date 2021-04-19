import { ICommand } from '@Interfaces/commands/command.interface';
import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { BaseCommandBus } from './base-command-bus';

/** Command bus */
@Injectable()
export class CommandBus<
	CommandBase extends ICommand = ICommand
> extends BaseCommandBus<CommandBase> {
	/**
	 * Creates a new command bus
	 * @param moduleRef Nest module providers
	 */
	constructor(protected readonly moduleRef: ModuleRef) {
		super(moduleRef);
	}

	/**
	 * Executes a command
	 * @param command Command
	 * @returns Command result
	 */
	execute(command: CommandBase): Promise<any> {
		const commandHandler = this.getCommandHandler(command);

		return commandHandler.execute(command);
	}
}
