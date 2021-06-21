import { Injectable, Type } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { Module } from '@nestjs/core/injector/module';
import {
	COMMAND_HANDLER_METADATA,
	EVENTS_HANDLER_METADATA,
	QUERY_HANDLER_METADATA,
} from '../constants/reflect-keys.constants';
import { ICommandHandler } from '../interfaces/commands/command-handler.interface';
import { CqrsOptions } from '../interfaces/cqrs-options.interface';
import { IEventHandler } from '../interfaces/events/event-handler.interface';
import { EventType } from '../interfaces/events/event-metadata.interface';
import { IQueryHandler } from '../interfaces/queries/query-handler.interface';

/**
 * Nest application modules explorer
 */
@Injectable()
export class ExplorerService {
	/**
	 * Creates a new explorer service
	 * @param modulesContainer Nest application modules container
	 */
	constructor(private readonly modulesContainer: ModulesContainer) {}

	/**
	 * Explores all Nest application modules to get commands, queries, events and sagas providers
	 * @returns CQRS commands, queries, events and sagas providers
	 */
	explore(): CqrsOptions {
		const modules = [...this.modulesContainer.values()];

		const commands = this.flatMap<ICommandHandler>(modules, instance =>
			this.filterProvider<ICommandHandler>(instance, COMMAND_HANDLER_METADATA)
		);

		const queries = this.flatMap<IQueryHandler>(modules, instance =>
			this.filterProvider<IQueryHandler>(instance, QUERY_HANDLER_METADATA)
		);

		const syncEvents = this.flatMap<IEventHandler>(modules, instance =>
			this.filterEventProvider<IEventHandler>(
				instance,
				EVENTS_HANDLER_METADATA,
				EventType.SYNC
			)
		);

		const asyncEvents = this.flatMap<IEventHandler>(modules, instance =>
			this.filterEventProvider<IEventHandler>(
				instance,
				EVENTS_HANDLER_METADATA,
				EventType.ASYNC
			)
		);

		return {
			commandHandlers: commands,
			queryHandlers: queries,
			syncEventHandlers: syncEvents,
			asyncEventHandlers: asyncEvents,
		};
	}

	/**
	 * Maps all module providers, applies a callback function on each one, and returns those that are not undefined
	 * @param modules All application modules
	 * @param callback Callback function to apply to each provider
	 * @returns Providers
	 */
	private flatMap<T>(
		modules: Module[],
		callback: (instance: InstanceWrapper) => Type<any> | undefined
	): Type<T>[] {
		const items = modules
			.map(module => [...module.providers.values()].map(callback))
			.reduce((a, b) => a.concat(b), []);
		return items.filter(element => !!element) as Type<T>[];
	}

	/**
	 * Filters providers whose metadata key contains a class
	 * @param wrapper Nest dependency injection instance wrapper
	 * @param metadataKey Metadata key
	 * @returns Class or undefined
	 */
	private filterProvider<T>(
		wrapper: InstanceWrapper,
		metadataKey: string
	): Type<T> | undefined {
		const { instance } = wrapper;
		if (!instance || !instance.constructor) return undefined;

		const metadata = Reflect.getMetadata(metadataKey, instance.constructor);
		return metadata ? (instance.constructor as Type<any>) : undefined;
	}

	/**
	 * Filters event providers whose metadata key contains a class, and its event type is equals to
	 * given event type
	 * @param wrapper Nest dependency injection instance wrapper
	 * @param metadataKey Metadata key
	 * @param eventType Event type
	 * @returns Class or undefined
	 */
	private filterEventProvider<TEvent>(
		wrapper: InstanceWrapper,
		metadataKey: string,
		eventType: EventType
	): Type<TEvent> | undefined {
		const { instance } = wrapper;
		if (!instance || !instance.constructor) return undefined;

		const metadata = Reflect.getMetadata(metadataKey, instance.constructor);

		if (!metadata) return undefined;

		return (metadata.eventType as EventType) === eventType
			? (instance.constructor as Type<any>)
			: undefined;
	}
}
