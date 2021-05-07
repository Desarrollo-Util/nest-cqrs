import {
	DynamicModule,
	Global,
	Inject,
	Logger,
	Module,
	OnApplicationBootstrap,
	OnModuleDestroy,
	Provider,
} from '@nestjs/common';
import { CommandBus } from '../commands/command-bus';
import { DI_TOKEN_EVENT_BUS_CONFIG } from '../constants/di-tokens.constants';
import {
	DITokenCommandBus,
	InjectCommandBus,
} from '../decorators/inject-command-bus.decorator';
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
import { RabbitMQModuleConfig } from '../interfaces/rabbitmq/rabbitmq-config.interface';
import { QueryBus } from '../queries/query-bus';
import { ExplorerService } from '../services/explorer.service';

/**
 * Standard CQRS module
 */
@Global()
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
		private readonly eventBus: IEventBus,
		@Inject(DI_TOKEN_EVENT_BUS_CONFIG)
		private readonly config: RabbitMQModuleConfig
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
				{ provide: DI_TOKEN_EVENT_BUS_CONFIG, useValue: options.config },
				...busProviders,
			],
			exports: busProviders,
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
					provide: DI_TOKEN_EVENT_BUS_CONFIG,
					useFactory: options.useFactory,
					inject: options.inject || [],
				},
				...busProviders,
			],
			exports: busProviders,
		};
	}

	/**
	 * Binds all queries and commands on application bootstrap
	 */
	async onApplicationBootstrap() {
		const { commands, queries, events } = this.explorerService.explore();

		this.commandBus.register(commands);
		this.queryBus.register(queries);
		await this.eventBus.initialize(this.config);
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
