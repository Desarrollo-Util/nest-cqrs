import {
	DynamicModule,
	Logger,
	Module,
	OnApplicationBootstrap,
	OnModuleDestroy,
	Provider,
} from '@nestjs/common';
import { CommandBus } from '../commands/command-bus';
import {
	DITokenCommandBus,
	InjectCommandBus,
} from '../decorators/inject-command-bus.decorator';
import { DITokenEventBusConfig } from '../decorators/inject-event-bus-config.decorator';
import {
	DITokenEventBus,
	InjectEventBus,
} from '../decorators/inject-event-bus.decorator';
import {
	DITokenQueryBus,
	InjectQueryBus,
} from '../decorators/inject-query-bus.decorator';
import { RabbitEventBus } from '../events/rabbitmq/rabbitmq-event-bus';
import { ICommandBus, IEventBus, IQueryBus } from '../interfaces';
import {
	CqrsModuleAsyncOptions,
	CqrsModuleBusImplementations,
	CqrsModuleOptions,
} from '../interfaces/cqrs-module-options.interface';
import { QueryBus } from '../queries/query-bus';
import { ExplorerService } from '../services/explorer.service';

/**
 * Standard CQRS module
 */
@Module({
	providers: [ExplorerService],
})
export class CqrsModule implements OnApplicationBootstrap, OnModuleDestroy {
	/**
	 * Dependency injection
	 * @param explorerService Explorer service
	 * @param commandBus Command bus
	 * @param queryBus Query bus
	 */
	constructor(
		private readonly explorerService: ExplorerService,
		@InjectCommandBus()
		private readonly commandBus: ICommandBus,
		@InjectQueryBus()
		private readonly queryBus: IQueryBus,
		@InjectEventBus()
		private readonly eventBus: IEventBus
	) {}

	/**
	 * Gets bus providers, allowing to keep default providers or replace any of them with a custom implementation
	 * @param implementations Custom implementations
	 * @returns Bus providers
	 */
	private static createBusProviders(
		implementations?: CqrsModuleBusImplementations
	): Provider[] {
		return [
			{
				provide: DITokenCommandBus,
				useClass: implementations?.commandBus || CommandBus,
			},
			{
				provide: DITokenQueryBus,
				useClass: implementations?.queryBus || QueryBus,
			},
			{
				provide: DITokenEventBus,
				useClass: implementations?.eventBus || RabbitEventBus,
			},
		];
	}

	/**
	 * Configures the module
	 * @param options Module options
	 * @returns Nest module
	 */
	static register<T = any>(options: CqrsModuleOptions<T>): DynamicModule {
		const busProviders = this.createBusProviders(options.busImplementations);

		return {
			module: CqrsModule,
			providers: [
				{ provide: DITokenEventBusConfig, useValue: options.config },
				...busProviders,
			],
			exports: busProviders,
			global: true,
		};
	}

	/**
	 * Configures the module asyncronously
	 * @param options Async module options
	 * @returns Nest module
	 */
	static registerAsync<T = any>(
		options: CqrsModuleAsyncOptions<T>
	): DynamicModule {
		const busProviders = this.createBusProviders(options.busImplementations);

		return {
			module: CqrsModule,
			imports: options.imports,
			providers: [
				{
					provide: DITokenEventBusConfig,
					useFactory: options.useFactory,
					inject: options.inject || [],
				},
				...busProviders,
			],
			exports: busProviders,
			global: true,
		};
	}

	/**
	 * Binds all queries and commands on application bootstrap
	 */
	async onApplicationBootstrap() {
		const { commands, queries, events } = this.explorerService.explore();

		this.commandBus.register(commands);
		this.queryBus.register(queries);
		await this.eventBus.initialize();
		this.eventBus.registerMany(events);
	}

	/**
	 * Closes event bus connection on module destroy
	 */
	async onModuleDestroy() {
		Logger.verbose('Closing event bus connection', CqrsModule.name);
		await this.eventBus.closeConnection();
		Logger.verbose('Event bus connection closed', CqrsModule.name);
	}
}
