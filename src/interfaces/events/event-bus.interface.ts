import { Type } from '@nestjs/common';
import { IEvent } from '../../interfaces/events/event.interface';
import { IEventHandler } from './event-handler.interface';

export interface IEventBus {
	initialize(config?: any): void;
	register(eventHandler: Type<IEventHandler>): Promise<void>;
	registerMany(eventHandlers: Type<IEventHandler>[]): Promise<void>;
	publish(event: IEvent): Promise<void>;
	publishAll(events: IEvent[]): Promise<void>;
}
