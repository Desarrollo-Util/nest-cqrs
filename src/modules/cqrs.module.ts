import {
	DynamicModule,
	Global,
	Inject,
	Module,
	OnApplicationBootstrap,
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
import { RabbitEventBus } from '../events/event-bus';
import { ICommandBus, IEventBus, IQueryBus } from '../interfaces';
import { RabbitMQModuleConfig } from '../interfaces/rabbitmq/rabbitmq-config.interface';
import { QueryBus } from '../queries/query-bus';
import { ExplorerService } from '../services/explorer.service';

/** Command bus provider dependency inversion */
const commandBus: Provider = {
	provide: DITokenCommandBus,
	useClass: CommandBus,
};

/** Query bus provider dependency inversion */
const queryBus: Provider = {
	provide: DITokenQueryBus,
	useClass: QueryBus,
};

/** Event bus provider dependency inversion */
const eventBus: Provider = {
	provide: DITokenEventBus,
	useClass: RabbitEventBus,
};

/**
 * Standard CQRS module
 */
@Global()
@Module({
	providers: [commandBus, queryBus, eventBus, ExplorerService],
	exports: [commandBus, queryBus, eventBus],
})
export class CqrsModule implements OnApplicationBootstrap {
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

	static register(config: RabbitMQModuleConfig): DynamicModule {
		return {
			module: CqrsModule,
			providers: [{ provide: DI_TOKEN_EVENT_BUS_CONFIG, useValue: config }],
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
}
