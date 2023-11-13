import { createHTTPServer } from "@trpc/server/adapters/standalone";
import findFreePorts from "find-free-ports";
import type { GlobalSetupContext } from "vitest/node";

import { appRouter } from "./databases/router";

declare module "vitest" {
	interface ProvidedContext {
		routerConfig: {
			port: number;
			hostname: string;
		};
	}
}

export default async (context: GlobalSetupContext) => {
	const routerConfig = {
		port: (await findFreePorts())[0]!,
		hostname: "localhost",
	};
	context.provide("routerConfig", routerConfig);
	const httpServer = createHTTPServer({ router: appRouter });
	await new Promise<void>((resolve) => {
		httpServer.listen(routerConfig.port, routerConfig.hostname, resolve);
	});
	const caller = appRouter.createCaller({});
	await caller.setup({ maxDatabases: context.config.maxConcurrency });
	return async () => {
		await caller.teardown();
		await new Promise<void>((resolve, reject) => {
			httpServer.server.close((err) => (err ? reject(err) : resolve()));
		});
	};
};
