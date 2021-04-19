import { COMMAND_HANDLER_METADATA } from '@Constants/reflect-keys.constants';
import { InvalidQueryHandlerException } from '@Exceptions/invalid-query-handler.exception';
import { QueryHandlerNotFoundException } from '@Exceptions/query-not-found.exception';
import { IQueryBus } from '@Interfaces/queries/query-bus.interface';
import { IQueryHandler } from '@Interfaces/queries/query-handler.interface';
import { IQuery } from '@Interfaces/queries/query.interface';
import { Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

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
			COMMAND_HANDLER_METADATA,
			handler
		);

		if (!target) throw new InvalidQueryHandlerException();

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
