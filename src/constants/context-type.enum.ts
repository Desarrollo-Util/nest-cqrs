/** Types of caught exceptions */
export enum ExceptionTypes {
	/** From GraphQL requests */
	GRAPHQL = 'graphql',
	/** From REST requests */
	HTTP = 'http',
	/** From RPC requests */
	RPC = 'rpc',
	/** From AMQP requests */
	AMQP = 'amqp',
}
