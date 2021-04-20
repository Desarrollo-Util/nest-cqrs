/** RabbitMQ base queue options */
export interface IRabbitMQBaseQueueOptions {
	/** Queue name */
	queueName: string;
	/** Main routing key */
	routingKey: string;
	/** Retry routing key */
	retryRoutingKey: string;
}
