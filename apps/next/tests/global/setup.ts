import type { Config } from "@jest/types";
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import findFreePorts from "find-free-ports";

import { appRouter } from "../databases/router";

declare global {
	/* eslint-disable vars-on-top, no-var */
	var handle: {
		kill: () => Promise<unknown>;
		caller: ReturnType<(typeof appRouter)["createCaller"]>;
	};
	var routerConfig: {
		port: number;
		hostname: string;
	};
	/* eslint-enable vars-on-top, no-var */
}

export default async (
	config: Config.GlobalConfig,
	projectConfig: Config.ProjectConfig,
) => {
	const routerConfig: (typeof globalThis)["routerConfig"] = {
		port: (await findFreePorts())[0]!,
		hostname: "localhost",
	};
	projectConfig.globals.routerConfig = routerConfig;
	const httpServer = createHTTPServer({ router: appRouter });
	await new Promise<void>((resolve) => {
		httpServer.listen(routerConfig.port, routerConfig.hostname, resolve);
	});
	const caller = appRouter.createCaller({});
	globalThis.handle = {
		kill: () =>
			new Promise<void>((resolve, reject) => {
				httpServer.server.close((err) => (err ? reject(err) : resolve()));
			}),
		caller,
	};
	await caller.setup({ maxDatabases: config.maxWorkers });
};
