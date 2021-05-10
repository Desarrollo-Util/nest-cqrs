import { Inject } from '@nestjs/common';

/** Event bus dependency injection token */
export const DITokenEventBusConfig = Symbol('EventBusConfig');

/** Event bus dependency injection decorator */
export const InjectEventBusConfig = () => Inject(DITokenEventBusConfig);
