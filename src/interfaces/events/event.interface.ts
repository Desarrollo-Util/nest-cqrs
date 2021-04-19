/** Event */
export interface IEvent<T extends Record<string, any> = any> {
	/** Event's id */
	id: string;
	/** Event's ocurred on date */
	ocurredOn: string;
	/** Event's type */
	type: string;
	/** Event's attributes */
	attributes: T;
}
