import type { FullConfig } from "@playwright/test";
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import findFreePorts from "find-free-ports";
import assert from "node:assert";

import { appRouter } from "./router";

const globalSetup = async (config: FullConfig) => {
	const portManagerPort = (await findFreePorts())[0];
	assert(portManagerPort);
	process.env.MANAGER_PORT = portManagerPort.toString();
	const httpServer = createHTTPServer({ router: appRouter });
	await new Promise<void>((resolve) => {
		httpServer.listen(portManagerPort, resolve);
	});
	config.metadata.portManagerServer = httpServer;
};

export default globalSetup;
