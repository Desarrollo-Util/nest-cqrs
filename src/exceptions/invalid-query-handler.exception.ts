import { CqrsException } from './cqrs.exception';

/** Missing @QueryHandler() decorator */
export class InvalidQueryHandlerException extends CqrsException {
	/**
	 * Creates a new exception
	 */
	constructor() {
		super(
			`Invalid query handler exception (missing @QueryHandler() decorator?)`
		);
	}
}
