import { DynamicModule, ForwardReference, Type } from '@nestjs/common';
import { ICommandBus } from './commands/command-bus.interface';
import { IEventBus } from './events/event-bus.interface';
import { IQueryBus } from './queries/query-bus.interface';

/** CQRS buses implementation */
export interface CqrsModuleBusImplementations {
	/** Command bus implementation class */
	commandBus?: Type<ICommandBus>;
	/** Query bus implementation class */
	queryBus?: Type<IQueryBus>;
	/** Event bus implementation class */
	eventBus?: Type<IEventBus>;
}

/** CQRS Nest module options */
export interface CqrsModuleOptions<TEventBusConfig = any> {
	/** Event bus config */
	config: TEventBusConfig;
	/** Buses implementations */
	busImplementations?: CqrsModuleBusImplementations;
}

/** CQRS Nest async module options */
export interface CqrsModuleAsyncOptions<TEventBusConfig = any> {
	/** Nest imports */
	imports: Array<
		Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference
	>;
	/** Gets event bus config */
	useFactory: (...args: any[]) => Promise<TEventBusConfig> | TEventBusConfig;
	/** Instances to inject into useFactory */
	inject: any[];
	/** Buses implementations */
	busImplementations?: CqrsModuleBusImplementations;
}
