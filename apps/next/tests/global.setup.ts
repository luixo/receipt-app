import { createHTTPServer } from "@trpc/server/adapters/standalone";
import findFreePorts from "find-free-ports";
import type { Vitest } from "vitest";

import { appRouter } from "./databases/router";

declare module "vitest" {
	interface EnvironmentOptions {
		routerConfig: {
			port: number;
			hostname: string;
		};
	}
}

export default async (vitest: Vitest) => {
	const routerConfig = {
		port: (await findFreePorts())[0]!,
		hostname: "localhost",
	};
	vitest.configOverride.environmentOptions = {
		routerConfig,
	};
	const httpServer = createHTTPServer({ router: appRouter });
	await new Promise<void>((resolve) => {
		httpServer.listen(routerConfig.port, routerConfig.hostname, resolve);
	});
	const caller = appRouter.createCaller({});
	await caller.setup({ maxDatabases: vitest.config.maxConcurrency });
	return async () => {
		await caller.teardown();
		await new Promise<void>((resolve, reject) => {
			httpServer.server.close((err) => (err ? reject(err) : resolve()));
		});
	};
};
