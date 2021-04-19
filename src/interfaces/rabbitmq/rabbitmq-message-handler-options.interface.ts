import { RabbitMQErrorHandlerTypes } from '@Constants/rabbitmq/rabbitmq-error-handler-types.enum';
import { QueueOptions } from './rabbitmq-queue-options.interface';

export interface MessageHandlerOptions {
	exchange: string;
	routingKey: string | string[];
	queue?: string;
	queueOptions?: QueueOptions;
	errorHandler?: RabbitMQErrorHandlerTypes;
}
