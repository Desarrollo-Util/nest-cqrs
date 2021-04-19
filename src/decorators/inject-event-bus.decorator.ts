import { Inject } from '@nestjs/common';

/** Event bus dependency injection token */
export const DITokenEventBus = Symbol('IEventBus');

/** Event bus dependency injection decorator */
export const InjectEventBus = () => Inject(DITokenEventBus);
