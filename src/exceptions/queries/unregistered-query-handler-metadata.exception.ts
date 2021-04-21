import { CqrsException } from '../cqrs.exception';

/** Unregistered metadata for a query handler */
export class UnregisteredQueryHandlerMetadataException extends CqrsException {
	/**
	 * Creates a new exception
	 * @param queryHandlerName Query handler name
	 */
	constructor(queryHandlerName: string) {
		super(
			`Unregistered metadata for ${queryHandlerName} (missing @QueryHandler() decorator?)`
		);
	}
}
