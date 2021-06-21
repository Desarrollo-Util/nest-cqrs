import { Type } from '@nestjs/common';
import { ICommandHandler } from './commands/command-handler.interface';
import { IEventHandler } from './events/event-handler.interface';
import { IQueryHandler } from './queries/query-handler.interface';

/** CQRS module options */
export interface CqrsOptions {
	/** Querie handlers */
	queryHandlers: Type<IQueryHandler>[];
	/** Command handlers */
	commandHandlers: Type<ICommandHandler>[];
	/** Sync event handlers */
	syncEventHandlers: Type<IEventHandler>[];
	/** Async event handlers */
	asyncEventHandlers: Type<IEventHandler>[];
}
