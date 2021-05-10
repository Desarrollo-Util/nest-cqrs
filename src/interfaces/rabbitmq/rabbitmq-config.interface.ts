import type amqpConnectionManager from 'amqp-connection-manager';
import type amqplib from 'amqplib';
import { RabbitMQExchangeConfig } from './rabbitmq-exchange-config.interface';

/** Initialize connection options */
export interface ConnectionInitOptions {
	/** Should wait until RabbitMQ is connected? */
	wait?: boolean;
	/** If wait is true, how much milliseconds should wait? */
	timeout?: number;
	/** Should reject an error if timeout? */
	reject?: boolean;
}

/** RabbitMQ config options */
export interface RabbitMQConfig {
	/** RabbitMQ connection URI */
	uri: string | string[];
	/** Maximum number of messages that can be processed simultaneously without receiving ACK */
	prefetchCount?: number;
	/** RabbitMQ exchanges config */
	exchanges: RabbitMQExchangeConfig[];
	/** Default exchange type */
	defaultExchangeType?: 'direct' | 'topic' | 'fanout';
	/** Connection initialization config */
	connectionInitOptions: ConnectionInitOptions;
	/** Connection manager options */
	connectionManagerOptions?: amqpConnectionManager.AmqpConnectionManagerOptions;
	/** Callback to execute when connection close */
	onConnectionClose?: () => void;
	/** Error handler */
	errorHandler: (
		channel: amqplib.Channel,
		msg: amqplib.ConsumeMessage,
		error?: Error
	) => void;
}

export interface RabbitMQModuleConfig
	extends Omit<RabbitMQConfig, 'exchanges' | 'errorHandler'> {
	/** Exchange common prefix */
	prefix: string;
	/** Retry TTL*/
	retryTtl: number;
	/** Max retries */
	maxRetries: number;
}
