import "~utils/temporal-polyfill";
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import type { TestProject } from "vitest/node";

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
	const httpServer = promisifyServer(createHTTPServer({ router: appRouter }));
	const url = await httpServer.listen(0);
	context.provide("routerConfig", { port: Number(url.port) });
	const caller = createCaller({});
	await caller.setup({ maxDatabases: context.config.maxConcurrency });
	return async () => {
		await caller.teardown();
		await httpServer.close();
	};
};

export default setup;
