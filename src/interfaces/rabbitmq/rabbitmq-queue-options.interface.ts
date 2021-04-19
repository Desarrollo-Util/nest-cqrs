export interface QueueOptions {
	durable?: boolean;
	exclusive?: boolean;
	autoDelete?: boolean;
	arguments?: any;
	messageTtl?: number;
	expires?: number;
	deadLetterExchange?: string;
	deadLetterRoutingKey?: string;
	maxLength?: number;
	maxPriority?: number;
}
