import type { FullConfig } from "@playwright/test";
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import colors from "colors";
import { capitalize } from "remeda";

import { serverMessages } from "~tests/frontend/server-reporter";
import { promisifyServer } from "~utils/promise";
import { getFreePort } from "~utils/server/port";

import { appRouter } from "./router";

const globalSetup = async (config: FullConfig) => {
	const portManagerPort = await getFreePort();
	process.env.MANAGER_PORT = portManagerPort.toString();
	process.env.PLAYWRIGHT = "true";
	const httpServer = promisifyServer(createHTTPServer({ router: appRouter }));
	await httpServer.listen(portManagerPort);
	// oxlint-disable-next-line no-param-reassign
	config.metadata.portManagerServer = httpServer;
	return async () => {
		if (serverMessages.length !== 0) {
			const message = [
				colors.red("Server errors occurred"),
				...serverMessages.map((element) =>
					[
						element.suspectTests.length === 1
							? element.suspectTests[0]
							: [colors.dim("Suspect tests:"), ...element.suspectTests].join(
									"\n",
								),
						`${colors.magenta(`[${capitalize(element.type)}]`)}: ${element.message}`,
					].join("\n\n"),
				),
			].join("\n\n");
			// oxlint-disable-next-line no-console
			console.warn(message);
			// TODO: Throw instead of warn
			// throw new Error(message);
		}
		await httpServer.close();
	};
};

export default globalSetup;
