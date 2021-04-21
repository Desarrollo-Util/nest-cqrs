import { Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { QUERY_HANDLER_METADATA } from '../constants/reflect-keys.constants';
import { QueryHandlerNotFoundException } from '../exceptions/queries/query-handler-not-found.exception';
import { UnregisteredQueryHandlerMetadataException } from '../exceptions/queries/unregistered-query-handler-metadata.exception';
import { IQueryBus } from '../interfaces/queries/query-bus.interface';
import { IQueryHandler } from '../interfaces/queries/query-handler.interface';
import { IQuery } from '../interfaces/queries/query.interface';

/** Query handler class */
type QueryHandlerType = Type<IQueryHandler<IQuery>>;

/**
 *	Base query bus
 */
export abstract class BaseQueryBus<QueryBase extends IQuery = IQuery>
	implements IQueryBus<QueryBase> {
	/** Handlers binded to query bus */
	private _handlers = new Map<string, IQueryHandler<QueryBase>>();

	/**
	 * Creates a new query bus
	 * @param moduleRef Nest module providers
	 */
	constructor(protected readonly moduleRef: ModuleRef) {}

	/**
	 * Executes a query
	 * @param query Query
	 * @returns Query result
	 */
	abstract execute(query: QueryBase): Promise<any>;

	/**
	 * Bind a handler to query bus
	 * @param queryHandler Query handler
	 * @param queryName Query name
	 */
	bind(queryHandler: IQueryHandler<QueryBase>, queryName: string): void {
		this._handlers.set(queryName, queryHandler);
	}

	/**
	 * Binds an array of handlers
	 * @param handlers Handlers
	 */
	register(handlers: QueryHandlerType[] = []): void {
		handlers.forEach(handler => this.registerHandler(handler));
	}

	/**
	 * Gets query name from a query
	 * @param query Query
	 * @returns Query name
	 */
	protected getQueryName(query: QueryBase): string {
		return Object.getPrototypeOf(query).constructor.name as string;
	}

	/**
	 * Reflects query name from metadata
	 * @param handler Query handler
	 * @returns Query name
	 */
	protected reflectQueryName(handler: QueryHandlerType): string {
		const target: FunctionConstructor | undefined = Reflect.getMetadata(
			QUERY_HANDLER_METADATA,
			handler
		);

		if (!target)
			throw new UnregisteredQueryHandlerMetadataException(handler.name);

		return target.name;
	}

	/**
	 * Gets a query handler for a query
	 * @param query Query
	 * @returns Query handler
	 */
	protected getQueryHandler(query: QueryBase): IQueryHandler<QueryBase> {
		const queryName = this.getQueryName(query);
		const queryHandler = this._handlers.get(queryName);

		if (!queryHandler) throw new QueryHandlerNotFoundException(queryName);

		return queryHandler;
	}

	/**
	 * Registers a single handler to the query bus
	 * @param handler Query handler
	 */
	protected registerHandler(handler: QueryHandlerType): void {
		const instance = this.moduleRef.get(handler, { strict: false });
		if (!instance) return;

		const queryName = this.reflectQueryName(handler);
		this.bind(instance as IQueryHandler<QueryBase>, queryName);
	}
}
