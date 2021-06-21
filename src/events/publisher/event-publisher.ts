import { EventPublishSort } from '../../constants';
import { InjectAsyncEventBus } from '../../decorators';
import { InjectSyncEventBus } from '../../decorators/inject-sync-event-bus.decorator';
import { IAsyncEventBus, ISyncEventBus } from '../../interfaces';
import { IEventPublisher } from '../../interfaces/events/event-publisher.interface';
import { AsyncEvent } from '../async-event';
import { SyncEvent } from '../sync-event';

/**
 * Event publisher implementation
 */
export class EventPublisher implements IEventPublisher {
	/**
	 * Dependency injection
	 * @param syncEventBus Sync event bus
	 * @param asyncEventBus Async event bus
	 */
	constructor(
		@InjectSyncEventBus()
		private readonly syncEventBus: ISyncEventBus,
		@InjectAsyncEventBus()
		private readonly asyncEventBus: IAsyncEventBus
	) {}

	/**
	 * Publish an event into corresponding event bus
	 * @param event Event
	 */
	async publish(event: SyncEvent | AsyncEvent): Promise<void> {
		if (event instanceof SyncEvent) {
			await this.syncEventBus.publish(event);
		} else if (event instanceof AsyncEvent) {
			await this.asyncEventBus.publish(event);
		}
	}

	/**
	 * Publish many events into corresponding event bus
	 * @param events Events
	 */
	async publishAll(
		events: Array<SyncEvent | AsyncEvent>,
		sort: EventPublishSort = EventPublishSort.FIRST_SYNC
	): Promise<void> {
		let sortedEvents = events;

		const syncEvents = events.filter(event => event instanceof SyncEvent);
		const asyncEvents = events.filter(event => event instanceof AsyncEvent);

		if (sort === EventPublishSort.FIRST_SYNC)
			sortedEvents = [...syncEvents, ...asyncEvents];
		else if (sort === EventPublishSort.FIRST_ASYNC)
			sortedEvents = [...asyncEvents, ...syncEvents];

		const publishPromises = sortedEvents.map(event => this.publish(event));

		await Promise.all(publishPromises);
	}
}
