import { Inject } from '@nestjs/common';

/** Sync event bus dependency injection token */
export const DITokenSyncEventBus = Symbol('ISyncEventBus');

/** Sync event bus dependency injection decorator */
export const InjectSyncEventBus = () => Inject(DITokenSyncEventBus);
