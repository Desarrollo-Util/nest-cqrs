import { CommandBus } from '@Commands/command-bus';
import { DITokenCommandBus } from '@Decorators/inject-command-bus.decorator';
import { DITokenQueryBus } from '@Decorators/inject-query-bus.decorator';
import { Module, OnApplicationBootstrap, Provider } from '@nestjs/common';
import { QueryBus } from '@Queries/query-bus';
import { ExplorerService } from '@Services/explorer.service';

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

/**
 * Standard CQRS module
 */
@Module({
	providers: [commandBus, queryBus, ExplorerService],
	exports: [commandBus, queryBus],
})
export class CqrsModule implements OnApplicationBootstrap {
	/**
	 * Dependency injection
	 * @param explorerService Explorer service
	 * @param commandsBus Command bus
	 * @param queryBus Query bus
	 */
	constructor(
		private readonly explorerService: ExplorerService,
		private readonly commandsBus: CommandBus,
		private readonly queryBus: QueryBus
	) {}

	/**
	 * Binds all queries and commands on application bootstrap
	 */
	onApplicationBootstrap() {
		const { commands, queries } = this.explorerService.explore();

		this.commandsBus.register(commands);
		this.queryBus.register(queries);
	}
}
