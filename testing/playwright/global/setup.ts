import type { FullConfig } from "@playwright/test";
import { createHTTPServer } from "@trpc/server/adapters/standalone";

import { getFreePort } from "~utils/port";

import { appRouter } from "./router";

const globalSetup = async (config: FullConfig) => {
	const portManagerPort = await getFreePort();
	process.env.MANAGER_PORT = portManagerPort.toString();
	const httpServer = createHTTPServer({ router: appRouter });
	await new Promise<void>((resolve) => {
		httpServer.listen(portManagerPort, resolve);
	});
	config.metadata.portManagerServer = httpServer;
};

export default globalSetup;
