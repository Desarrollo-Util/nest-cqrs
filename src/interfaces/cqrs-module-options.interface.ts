import { ICommandBus } from './commands/command-bus.interface';
import { IEventBus } from './events/event-bus.interface';
import { IQueryBus } from './queries/query-bus.interface';

/** CQRS Nest module options */
export interface CqrsModuleOptions<T = any> {
	/** Event bus config */
	config: T;
	/** Command bus implementation class */
	commandBus?: ICommandBus;
	/** Query bus implementation class */
	queryBus?: IQueryBus;
	/** Event bus implementation class */
	eventBus?: IEventBus;
}
