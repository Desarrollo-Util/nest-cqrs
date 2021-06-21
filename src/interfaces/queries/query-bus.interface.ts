import { Type } from '@nestjs/common';
import { IQueryHandler } from './query-handler.interface';
import { IQuery } from './query.interface';

/**
 * Query bus
 */
export interface IQueryBus<T extends IQuery = IQuery> {
	/**
	 * Executes a query
	 * @param query Query
	 * @returns Query result
	 */
	execute(query: T): any;

	/**
	 * Binds an array of handlers
	 * @param handlers Handlers
	 */
	register(handlers: Type<IQueryHandler>[]): void;
}
