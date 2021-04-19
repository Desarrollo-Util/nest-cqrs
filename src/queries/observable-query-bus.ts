import { IQuery } from '@Interfaces/queries/query.interface';
import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Subject } from 'rxjs';
import { BaseQueryBus } from './base-query-bus';

/** Query bus */
@Injectable()
export class ObservableQueryBus<
	QueryBase extends IQuery = IQuery
> extends BaseQueryBus<QueryBase> {
	/**
	 * Publisher observable
	 *  - Emits a next value with the query that gonna be executed
	 */
	private _publisher$: Subject<QueryBase>;

	/**
	 * Creates a new query bus
	 * @param moduleRef Nest module providers
	 */
	constructor(protected readonly moduleRef: ModuleRef) {
		super(moduleRef);
		this._publisher$ = new Subject<QueryBase>();
	}

	/**
	 * Publisher getter
	 */
	get publisher(): Subject<QueryBase> {
		return this._publisher$;
	}

	/**
	 * Executes a query
	 * @param query Query
	 * @returns Query result
	 */
	execute(query: QueryBase): Promise<any> {
		const queryHandler = this.getQueryHandler(query);

		this._publisher$.next(query);
		return queryHandler.execute(query);
	}
}
