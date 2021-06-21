export enum EventType {
	SYNC = 'sync',
	ASYNC = 'async',
}

/** Event reflector metadata */
export interface IEventMetadata {
	/** Event type */
	eventType: EventType;
	/** A prefix useful to distinguish events between different bounded contexts */
	eventPrefix: string;
	/** Class name of the event */
	eventName: string;
	/** Class name of the action triggered by the event*/
	actionName: string;
}
