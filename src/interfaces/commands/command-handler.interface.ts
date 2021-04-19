import { ICommand } from './command.interface';

/** Command handler */
export interface ICommandHandler<
	TCommand extends ICommand = ICommand,
	TResult = void
> {
	/**
	 * Executes the command
	 * @param command Command
	 * @returns Command result
	 */
	execute(command: TCommand): Promise<TResult>;
}
