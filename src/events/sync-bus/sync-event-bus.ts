import { Injectable, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { EVENTS_HANDLER_METADATA } from '../../constants';
import { UnregisteredEventHandlerMetadataException } from '../../exceptions';
import { EventHandlerNotFoundException } from '../../exceptions/events/event-handler-not-found.exception';
import { IEventHandler, ISyncEventBus } from '../../interfaces';
import { IEventMetadata } from '../../interfaces/events/event-metadata.interface';
import { SyncEvent } from '../sync-event';

/** Event handler class */
type EventHandlerType = Type<IEventHandler>;

/**
 * Sync event bus implementation
 */
@Injectable()
export class SyncEventBus implements ISyncEventBus {
	/** Handlers binded to event bus */
	private _handlers = new Map<string, IEventHandler[]>();

	/**
	 * Dependency injection
	 * @param moduleRef Nest module providers
	 */
	constructor(protected readonly moduleRef: ModuleRef) {}

	/**
	 * Register an event handler into event bus
	 * @param eventHandler Event handler
	 */
	public register(eventHandler: EventHandlerType): void {
		const instance = this.moduleRef.get(eventHandler, { strict: false });
		if (!instance) return;

		const eventName = this.reflectEventName(eventHandler);

		this.bind(instance as IEventHandler, eventName);
	}

	/**
	 * Register many event handlers into event bus
	 * @param eventHandlers Event handlers
	 */
	public registerMany(eventHandlers: EventHandlerType[]): void {
		for (const eventHandler of eventHandlers) this.register(eventHandler);
	}

	/**
	 * Publish an event into event bus
	 * @param event Event
	 */
	public async publish(event: SyncEvent): Promise<void> {
		const eventHandlers = this.getEventHandlers(event);

		const publishPromises = eventHandlers.map(eventHandler =>
			eventHandler.handle(event)
		);

		await Promise.all(publishPromises);
	}

	/**
	 * Publish many events into event bus
	 * @param events Events
	 */
	public async publishAll(events: SyncEvent[]): Promise<void> {
		const publishPromises = events.map(event => this.publish(event));

		await Promise.all(publishPromises);
	}

	/**
	 * Reflects event name from metadata
	 * @param handler Event handler
	 * @returns Event name
	 */
	private reflectEventName(handler: EventHandlerType): string {
		const target: IEventMetadata | undefined = Reflect.getMetadata(
			EVENTS_HANDLER_METADATA,
			handler
		);

		if (!target)
			throw new UnregisteredEventHandlerMetadataException(handler.name);

		return target.eventName;
	}

	/**
	 * Bind a handler to event bus
	 * @param eventHandler Event handler
	 * @param eventName Event name
	 */
	private bind(eventHandler: IEventHandler, eventName: string): void {
		const events = this._handlers.get(eventName) || [];

		events.push(eventHandler);

		this._handlers.set(eventName, events);
	}

	/**
	 * Gets event name from a event
	 * @param event Event
	 * @returns Event name
	 */
	private getEventName(event: SyncEvent): string {
		return Object.getPrototypeOf(event).constructor.name as string;
	}

	/**
	 * Gets a event handlers for a event
	 * @param event Event
	 * @returns Event handler
	 */
	private getEventHandlers(event: SyncEvent): IEventHandler[] {
		const eventName = this.getEventName(event);
		const eventHandler = this._handlers.get(eventName);

		if (!eventHandler) throw new EventHandlerNotFoundException(eventName);

		return eventHandler;
	}
}
