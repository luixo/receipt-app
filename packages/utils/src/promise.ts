import type { IncomingMessage, Server, ServerResponse } from "node:http";

export const wait = (ms: number) =>
	// This is the only place with new Promise
	// oxlint-disable-next-line promise/avoid-new
	new Promise((resolve) => {
		setTimeout(resolve, ms);
	});

type Unsubscribe = () => void;

export const promisifyEvent = <T = void>(
	subscribe: (
		listener: (result: T) => void,
		errorListener: (error: Error) => void,
	) => Unsubscribe | void,
) =>
	// This is the only place with new Promise
	// oxlint-disable-next-line promise/avoid-new
	new Promise<T>((resolve, reject) => {
		const unsubscribe = subscribe(
			(result) => {
				unsubscribe?.();
				resolve(result);
			},
			(error) => {
				unsubscribe?.();
				reject(error);
			},
		);
	});

export const promisifyServer = <
	Request extends typeof IncomingMessage = typeof IncomingMessage,
	Response extends typeof ServerResponse<InstanceType<Request>> =
		typeof ServerResponse,
>(
	server: Server<Request, Response>,
) => ({
	listen: (port: number) =>
		promisifyEvent((listener, errorListener) => {
			server.listen(port, listener);
			server.on("error", errorListener);
			return () => server.off("error", errorListener);
		}),
	close: () =>
		promisifyEvent((listener, errorListener) => {
			server.close((error) => {
				if (error) {
					errorListener(error);
				} else {
					listener();
				}
			});
		}),
});
