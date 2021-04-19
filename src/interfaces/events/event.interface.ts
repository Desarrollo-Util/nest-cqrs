/** Event */
export interface IEvent<T> {
	/** Event's id */
	id: string;
	/** Event's ocurred on date */
	ocurredOn: string;
	/** Event's type */
	type: string;
	/** Event's attributes */
	attributes: T;
}
