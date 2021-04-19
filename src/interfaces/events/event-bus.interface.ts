import { IEventHandler } from './event-handler.interface';

export interface IEventBus {
	initialize(config?: any): void;
	register(eventHandlers: IEventHandler<any>[]): Promise<void>;
}
