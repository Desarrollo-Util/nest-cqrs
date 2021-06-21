import { Inject } from '@nestjs/common';

/** Async event bus dependency injection token */
export const DITokenAsyncEventBus = Symbol('IAsyncEventBus');

/** Async event bus dependency injection decorator */
export const InjectAsyncEventBus = () => Inject(DITokenAsyncEventBus);
