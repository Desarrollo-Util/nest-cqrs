import { Type } from '@nestjs/common';
import { ICommandHandler } from './commands/command-handler.interface';
import { IEventHandler } from './events/event-handler.interface';
import { IQueryHandler } from './queries/query-handler.interface';

/** CQRS module options */
export interface CqrsOptions {
	/** Queries */
	queries?: Type<IQueryHandler>[];
	/** Commands */
	commands?: Type<ICommandHandler>[];
	/** Events */
	events?: Type<IEventHandler>[];
}
