import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Subject } from 'rxjs';
import { ICommand } from '../interfaces/commands/command.interface';
import { BaseCommandBus } from './base-command-bus';

/** Command bus */
@Injectable()
export class ObservableCommandBus<
	CommandBase extends ICommand = ICommand
> extends BaseCommandBus<CommandBase> {
	/**
	 * Publisher observable
	 *  - Emits a next value with the command that gonna be executed
	 */
	private _publisher$: Subject<CommandBase>;

	/**
	 * Creates a new command bus
	 * @param moduleRef Nest module providers
	 */
	constructor(protected readonly moduleRef: ModuleRef) {
		super(moduleRef);
		this._publisher$ = new Subject<CommandBase>();
	}

	/**
	 * Publisher getter
	 */
	get publisher(): Subject<CommandBase> {
		return this._publisher$;
	}

	/**
	 * Executes a command
	 * @param command Command
	 * @returns Command result
	 */
	execute(command: CommandBase): Promise<any> {
		const commandHandler = this.getCommandHandler(command);

		this._publisher$.next(command);
		return commandHandler.execute(command);
	}
}
