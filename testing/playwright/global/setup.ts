import { createHTTPServer } from "@trpc/server/adapters/standalone";
import colors from "colors";
import type { CoverageMapData } from "istanbul-lib-coverage";
import { capitalize } from "remeda";

import { urlSettings } from "~tests/frontend/consts";
import { isIgnored } from "~tests/frontend/fixtures/console";
import {
	generateCoverageReport,
	prepareCoverageEnv,
} from "~tests/frontend/global/coverage";
import { promisifyServer } from "~utils/promise";
import { getFreePort } from "~utils/server/port";

import {
	appRouter,
	coverageData as clientCoverage,
	testErrorEntries,
} from "./router";

const globalServerIgnored = [
	// Messages on server startup start with `$ bun run ...` or `$ node ...`
	/^\$ bun run/,
	/^\$ node/,
	// Some linux distros have problems with our locale
	/setlocale: LC_ALL: cannot change locale/,
];

const globalSetup = async () => {
	await prepareCoverageEnv();
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
		const response = await fetch(new URL("api/coverage", urlSettings.baseUrl), {
			method: "POST",
		});
		if (!response.ok) {
			throw new Error(`Failed to stop server coverage: ${response.status}`);
		}
		const { coverage: serverCoverage } = (await response.json()) as {
			coverage: CoverageMapData[];
		};
		generateCoverageReport({
			client: clientCoverage,
			server: serverCoverage,
		});
		await httpServer.close();
	};
};

export default globalSetup;
