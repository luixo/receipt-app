// It's just types
/* oxlint-disable import/no-nodejs-modules */
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { format } from "node:url";
/* oxlint-enable import/no-nodejs-modules */

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
	listen: (port = 0) =>
		promisifyEvent<URL>((listener, errorListener) => {
			server.listen(port, () => {
				const address = server.address();
				if (!address || typeof address === "string") {
					errorListener(new Error("Expected an internet server address"));
				} else {
					listener(
						new URL(
							format({
								protocol: "http:",
								hostname: address.address,
								port: address.port,
							}),
						),
					);
				}
			});
			server.on("error", errorListener);
			return () => {
				server.off("error", errorListener);
			};
		}),
	close: () =>
		promisifyEvent((listener, errorListener) => {
			server.closeAllConnections();
			server.close((error) => {
				if (error) {
					errorListener(error);
				} else {
					listener();
				}
			});
		}),
});
