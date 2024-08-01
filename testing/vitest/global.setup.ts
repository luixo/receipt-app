import { createHTTPServer } from "@trpc/server/adapters/standalone";
import findFreePorts from "find-free-ports";
import type { GlobalSetupContext } from "vitest/node";

import { appRouter, createCaller } from "./databases/router";

declare module "vitest" {
	// external interface extension
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface ProvidedContext {
		routerConfig: {
			port: number;
		};
	}
}

export default async (context: GlobalSetupContext) => {
	process.env.TZ = "GMT";
	const routerConfig = {
		port: (await findFreePorts())[0]!,
	};
	context.provide("routerConfig", routerConfig);
	const httpServer = createHTTPServer({ router: appRouter });
	await new Promise<void>((resolve) => {
		httpServer.listen(routerConfig.port, resolve);
	});
	const caller = createCaller({});
	await caller.setup({ maxDatabases: context.config.maxConcurrency });
	return async () => {
		await caller.teardown();
		await new Promise<void>((resolve, reject) => {
			httpServer.close((err) => (err ? reject(err) : resolve()));
		});
	};
};
