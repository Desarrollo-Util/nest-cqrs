import { Options } from 'amqplib';

/** Exchange config */
export interface RabbitMQExchangeConfig {
	/** Exchange name */
	name: string;
	/** Exchange type */
	type?: 'direct' | 'topic' | 'fanout';
	/** Exchange additional options */
	options?: Options.AssertExchange;
}
