/** Generic CQRS exception */
export class CqrsException extends Error {
	/**
	 * Creates a new exception
	 * @param message Exception message
	 */
	constructor(message: string) {
		super(message);
	}
}
