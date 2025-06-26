import { createHTTPServer } from "@trpc/server/adapters/standalone";
import type { TestProject } from "vitest/node";

import { getFreePort } from "~utils/port";

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

export default async (context: TestProject) => {
	process.env.TZ = "GMT";
	const port = await getFreePort();
	const routerConfig = { port };
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
