import { Inject } from '@nestjs/common';

/** Query bus dependency injection token */
export const DITokenQueryBus = Symbol('IQueryBus');

/** Query bus dependency injection decorator */
export const InjectQueryBus = () => Inject(DITokenQueryBus);
