import { createHTTPServer } from "@trpc/server/adapters/standalone";
import colors from "colors";
import type { CoverageMapData } from "istanbul-lib-coverage";
import { capitalize, keys } from "remeda";

import { urlSettings } from "~tests/frontend/consts";
import { isIgnored } from "~tests/frontend/fixtures/console";
import {
	generateCoverageReport,
	prepareCoverageEnv,
} from "~tests/frontend/global/coverage";
import { promisifyServer } from "~utils/promise";
import { mapJsCoverage } from "~utils/server/coverage";
import { getFreePort } from "~utils/server/port";
import { baseLogger } from "~web/providers/logger";

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

const getServerCoverage = async () => {
	const response = await fetch(new URL("api/coverage", urlSettings.baseUrl), {
		method: "POST",
	});
	if (!response.ok) {
		throw new Error(`Failed to stop server coverage: ${response.status}`);
	}
	return (await response.json()) as CoverageMapData;
};

const handleErrors = () => {
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
};

const handleCoverage = async () => {
	if (!process.env.COVERAGE) {
		return;
	}
	const serverCoverage = await getServerCoverage();
	baseLogger.info(
		`Generating coverage from ${clientCoverage.length} client and ${keys(serverCoverage).length} server data points`,
	);
	await generateCoverageReport({
		client: await mapJsCoverage(clientCoverage),
		server: serverCoverage,
	});
	baseLogger.info("Coverage generated.");
};

const globalSetup = async () => {
	await prepareCoverageEnv();
	const portManagerPort = await getFreePort();
	process.env.MANAGER_PORT = portManagerPort.toString();
	process.env.PLAYWRIGHT = "true";
	const httpServer = promisifyServer(createHTTPServer({ router: appRouter }));
	await httpServer.listen(portManagerPort);
	return async () => {
		handleErrors();
		await handleCoverage();
		await httpServer.close();
	};
};

export default globalSetup;
