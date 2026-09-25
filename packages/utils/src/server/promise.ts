import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { format } from "node:url";

import { promisifyEvent } from "~utils/promise";

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
