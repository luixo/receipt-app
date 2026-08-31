import { createHTTPServer } from "@trpc/server/adapters/standalone";
import type { TestProject } from "vitest/node";

import { getFreePort } from "~utils/port";
import { promisifyServer } from "~utils/promise";

import { appRouter, createCaller } from "./databases/router";

declare module "vitest" {
	// external interface extension
	// oxlint-disable-next-line typescript/consistent-type-definitions
	interface ProvidedContext {
		routerConfig: {
			port: number;
		};
	}
}

const setup = async (context: TestProject) => {
	process.env.TZ = "GMT";
	const port = await getFreePort();
	const routerConfig = { port };
	context.provide("routerConfig", routerConfig);
	const httpServer = promisifyServer(createHTTPServer({ router: appRouter }));
	await httpServer.listen(routerConfig.port);
	const caller = createCaller({});
	await caller.setup({ maxDatabases: context.config.maxConcurrency });
	return async () => {
		await caller.teardown();
		await httpServer.close();
	};
};

export default setup;
