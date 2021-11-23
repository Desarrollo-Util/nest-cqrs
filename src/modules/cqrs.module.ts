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
	DITokenAsyncEventBus,
	InjectAsyncEventBus,
} from '../decorators/inject-async-event-bus.decorator';
import {
	DITokenCommandBus,
	InjectCommandBus,
} from '../decorators/inject-command-bus.decorator';
import { DITokenEventBusConfig } from '../decorators/inject-event-bus-config.decorator';
import { DITokenEventPublisher } from '../decorators/inject-event-publisher.decorator';
import {
	DITokenQueryBus,
	InjectQueryBus,
} from '../decorators/inject-query-bus.decorator';
import {
	DITokenSyncEventBus,
	InjectSyncEventBus,
} from '../decorators/inject-sync-event-bus.decorator';
import { EventPublisher } from '../events/publisher/event-publisher';
import { RabbitEventBus } from '../events/rabbitmq/rabbitmq-event-bus';
import { SyncEventBus } from '../events/sync-bus/sync-event-bus';
import {
	IAsyncEventBus,
	ICommandBus,
	IQueryBus,
	ISyncEventBus,
} from '../interfaces';
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
		@InjectSyncEventBus()
		private readonly syncEventBus: ISyncEventBus,
		@InjectAsyncEventBus()
		private readonly asyncEventBus: IAsyncEventBus
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
				provide: DITokenSyncEventBus,
				useClass: implementations?.syncEventBus || SyncEventBus,
			},
			{
				provide: DITokenAsyncEventBus,
				useClass: implementations?.asyncEventBus || RabbitEventBus,
			},
			{
				provide: DITokenEventPublisher,
				useClass: implementations?.eventPublisher || EventPublisher,
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
		const {
			commandHandlers: commands,
			queryHandlers: queries,
			syncEventHandlers: syncEvents,
			asyncEventHandlers: asyncEvents,
		} = this.explorerService.explore();

		this.commandBus.register(commands);
		this.queryBus.register(queries);
		this.syncEventBus.registerMany(syncEvents);
		await this.asyncEventBus.initialize();
		this.asyncEventBus.registerMany(asyncEvents);
	}

	/**
	 * Closes event bus connection on module destroy
	 */
	async onModuleDestroy() {
		Logger.log('Closing event bus connection', CqrsModule.name);
		await this.asyncEventBus.closeConnection();
		Logger.log('Event bus connection closed', CqrsModule.name);
	}
}
