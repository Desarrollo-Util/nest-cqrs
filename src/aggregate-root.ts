import { IEvent } from './interfaces';

const INTERNAL_EVENTS = Symbol();

export abstract class AggregateRoot<EventBase extends IEvent = IEvent> {
	private readonly [INTERNAL_EVENTS]: EventBase[] = [];

	uncommit() {
		this[INTERNAL_EVENTS].length = 0;
	}

	getUncommittedEvents(): EventBase[] {
		return this[INTERNAL_EVENTS];
	}

	getAndPullEvents(): EventBase[] {
		const events = [...this.getUncommittedEvents()];
		this.uncommit();

		return events;
	}

	apply<T extends EventBase = EventBase>(event: T) {
		this[INTERNAL_EVENTS].push(event);
		const handler = this.getEventHandler(event);
		handler && handler.call(this, event);
	}

	protected getEventHandler<T extends EventBase = EventBase>(
		event: T
	): Function | undefined {
		const handler = `on${this.getEventName(event)}`;
		return this[handler];
	}

	protected getEventName(event: any): string {
		const { constructor } = Object.getPrototypeOf(event);
		return constructor.name as string;
	}
}
