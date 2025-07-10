import type { FullConfig } from "@playwright/test";
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import colors from "colors";
import { capitalize } from "remeda";

import { serverMessages } from "~tests/frontend/server-reporter";
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
	return () => {
		if (serverMessages.length !== 0) {
			const message = [
				colors.red("Server errors occurred"),
				...serverMessages.map((element) =>
					[
						element.suspectTests.length === 1
							? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
								element.suspectTests[0]!
							: [colors.dim("Suspect tests:"), ...element.suspectTests].join(
									"\n",
								),
						`${colors.magenta(`[${capitalize(element.type)}]`)}: ${element.message}`,
					].join("\n\n"),
				),
			].join("\n\n");
			// eslint-disable-next-line no-console
			console.warn(message);
			// TODO: Throw instead of warn
			// throw new Error(message);
		}
	};
};

export default globalSetup;
