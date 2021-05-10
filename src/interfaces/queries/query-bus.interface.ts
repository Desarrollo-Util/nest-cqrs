import { Type } from '@nestjs/common';
import { IQueryHandler } from './query-handler.interface';
import { IQuery } from './query.interface';

/** Query handler class */
type QueryHandlerType = Type<IQueryHandler<IQuery>>;

/** Query bus */
export interface IQueryBus<T extends IQuery = IQuery> {
	/**
	 * Executes a query
	 * @param query Query
	 * @returns Query result
	 */
	execute(query: T): any;

	/**
	 * Bind a handler to query bus
	 * @param queryHandler Query handler
	 * @param queryName Query name
	 */
	bind(queryHandler: IQueryHandler<T>, queryName: string): void;

	/**
	 * Binds an array of handlers
	 * @param handlers Handlers
	 */
	register(handlers: QueryHandlerType[]): void;
}
