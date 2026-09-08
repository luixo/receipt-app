import { createHTTPServer } from "@trpc/server/adapters/standalone";
import colors from "colors";
import { capitalize } from "remeda";

import { isIgnored } from "~tests/frontend/fixtures/console";
import { promisifyServer } from "~utils/promise";
import { getFreePort } from "~utils/server/port";

import { appRouter, testErrorEntries } from "./router";

const globalServerIgnored = [
	// Messages on server startup start with `$ bun run ...`
	/^\$ bun run/,
	// Some linux distros have problems with our locale
	/setlocale: LC_ALL: cannot change locale/,
];

const globalSetup = async () => {
	const portManagerPort = await getFreePort();
	process.env.MANAGER_PORT = portManagerPort.toString();
	process.env.PLAYWRIGHT = "true";
	const httpServer = promisifyServer(createHTTPServer({ router: appRouter }));
	await httpServer.listen(portManagerPort);
	return async () => {
		const unknownErrors = (testErrorEntries.unknown ?? []).filter(
			(entry) => !isIgnored(globalServerIgnored, entry.text),
		);
		if (unknownErrors.length !== 0) {
			throw new Error(
				[
					colors.red("Global server errors occurred"),
					...unknownErrors.map(
						(element) =>
							`${colors.magenta(`[${capitalize(element.type)}]`)}: ${element.text.trim()}`,
					),
					colors.red("End of global server errors"),
				].join("\n"),
			);
		}
		await httpServer.close();
	};
};

export default globalSetup;
