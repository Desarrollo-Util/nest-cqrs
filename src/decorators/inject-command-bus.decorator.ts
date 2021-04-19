import { Inject } from '@nestjs/common';

/** Command bus dependency injection token */
export const DITokenCommandBus = Symbol('ICommandBus');

/** Command bus dependency injection decorator */
export const InjectCommandBus = () => Inject(DITokenCommandBus);
