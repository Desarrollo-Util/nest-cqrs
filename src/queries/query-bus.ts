import { IQuery } from '@Interfaces/queries/query.interface';
import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { BaseQueryBus } from './base-query-bus';

/** Query bus */
@Injectable()
export class QueryBus<
	QueryBase extends IQuery = IQuery
> extends BaseQueryBus<QueryBase> {
	/**
	 * Creates a new query bus
	 * @param moduleRef Nest module providers
	 */
	constructor(protected readonly moduleRef: ModuleRef) {
		super(moduleRef);
	}

	/**
	 * Executes a query
	 * @param query Query
	 * @returns Query result
	 */
	execute(query: QueryBase): Promise<any> {
		const queryHandler = this.getQueryHandler(query);

		return queryHandler.execute(query);
	}
}
