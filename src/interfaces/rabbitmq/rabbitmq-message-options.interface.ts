import type amqplib from 'amqplib';
import { QueueOptions } from './rabbitmq-queue-options.interface';

/** RabbitMQ message options */
export interface IRabbitMQMessageOptions {
	/** Exchange to publish message */
	exchangeName: string;
	/** Routing key/s for message */
	routingKey: string | string[];
	/** Queue where must publish message */
	queueName: string;
	/** Queue options for message */
	queueOptions?: QueueOptions;
	/** Specific error handler for message*/
	errorHandler?: (
		channel: amqplib.Channel,
		msg: amqplib.ConsumeMessage,
		error?: Error
	) => void;
}
