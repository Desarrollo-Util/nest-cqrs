import { Inject } from '@nestjs/common';

/** Event publisher dependency injection token */
export const DITokenEventPublisher = Symbol('IEventPublisher');

/** Event publisher dependency injection decorator */
export const InjectEventPublisher = () => Inject(DITokenEventPublisher);
