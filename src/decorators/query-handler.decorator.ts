import { QUERY_HANDLER_METADATA } from '../constants/reflect-keys.constants';
import { IQuery } from '../interfaces/queries/query.interface';

/**
 * Decorator that marks a class as a CQRS query handler. A query handler
 * handles queries executed by your application code.
 *
 * The decorated class must implement the `IQueryHandler` interface.
 *
 * @param query query *type* to be handled by this handler.
 */
export const QueryHandler = (query: IQuery): ClassDecorator => {
	return (target: object) => {
		Reflect.defineMetadata(QUERY_HANDLER_METADATA, query, target);
	};
};
