import { ExecutionContext } from '@nestjs/common';
import { EVENTS_HANDLER_METADATA } from '../constants';

export const isEventContext = (executionContext: ExecutionContext) => {
	const handler = executionContext.getHandler();
	return Reflect.getMetadataKeys(handler).includes(EVENTS_HANDLER_METADATA);
};
