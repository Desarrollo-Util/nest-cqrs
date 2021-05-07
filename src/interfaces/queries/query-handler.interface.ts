import { IQuery } from './query.interface';

/** Query handler */
export interface IQueryHandler<TQuery extends IQuery = IQuery, TResult = any> {
	/**
	 * Executes the query
	 * @param query Query
	 * @returns Query result
	 */
	execute(query: TQuery): TResult | Promise<TResult>;
}
