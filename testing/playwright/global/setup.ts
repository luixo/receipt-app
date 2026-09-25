import { createHTTPServer } from "@trpc/server/adapters/standalone";
import colors from "colors";
import * as fs from "node:fs/promises";
import path from "node:path";
import { entries, isNonNullish } from "remeda";

import type { NodeV8Coverage } from "~coverage/index";
import {
	fromNodeV8Coverage,
	fromPlaywrightCoverage,
	generateCoverageReport,
	mergeCoverageMaps,
} from "~coverage/index";
import { coverageDir, urlSettings } from "~tests/frontend/consts";
import { getIgnoredIndex } from "~tests/frontend/fixtures/console";
import { promisifyServer } from "~utils/server/promise";
import { baseLogger } from "~web/providers/logger";

import {
	appRouter,
	coverageData as rawClientCoverage,
	testErrorEntries,
} from "./router";

const globalServerIgnored = [
	// Messages on server startup start with `$ bun run ...` or `$ node ...`
	/^\$ bun run/,
	/^\$ node/,
	// Some linux distros have problems with our locale
	/setlocale: LC_ALL: cannot change locale/,
].map((pattern) => ({ pattern, used: false }));

const getServerCoverage = async () => {
	const response = await fetch(new URL("api/coverage", urlSettings.baseUrl), {
		method: "POST",
	});
	if (!response.ok) {
		throw new Error(`Failed to stop server coverage: ${response.status}`);
	}
	return fromNodeV8Coverage((await response.json()) as NodeV8Coverage);
};

const UNKNOWN_IDS = new Set(["unknown", "no-test-id"]);
const handleErrors = () => {
	const unknownErrors = entries(testErrorEntries)
		.flatMap(([key, subEntries]) =>
			// oxlint-disable-next-line typescript/no-non-null-assertion
			UNKNOWN_IDS.has(key) ? subEntries! : [],
		)
		.map((entry) => {
			const ignoredIndex = getIgnoredIndex(globalServerIgnored, entry.text);
			if (ignoredIndex === -1) {
				return `${colors.magenta(`[server-global][${entry.type}]`)} ${entry.text}${entry.text.length === entry.text.trim().length ? "" : " (trimmed length is different)"}`;
			}
			// oxlint-disable-next-line typescript/no-non-null-assertion
			globalServerIgnored[ignoredIndex]!.used = true;
			return undefined;
		})
		.filter(isNonNullish);
	if (unknownErrors.length !== 0) {
		throw new Error(
			[
				colors.red("Global server errors occurred"),
				...unknownErrors,
				colors.red("End of global server errors"),
			].join("\n"),
		);
	}
};

const coverageDataDir = path.join(coverageDir, "data");
const handleCoverage = async () => {
	if (!process.env.COVERAGE) {
		return;
	}
	const serverCoverage = await getServerCoverage();
	const clientCoverage = await fromPlaywrightCoverage(rawClientCoverage);
	baseLogger.info(
		`Handling coverage of ${clientCoverage.files().length} client and ${serverCoverage.files().length} server files`,
	);
	await fs.mkdir(coverageDataDir, { recursive: true });
	await fs.writeFile(
		path.join(coverageDataDir, "server.json"),
		JSON.stringify(serverCoverage.data),
	);
	await fs.writeFile(
		path.join(coverageDataDir, "client.json"),
		JSON.stringify(clientCoverage.data),
	);
	baseLogger.info("Generating coverage report");
	const mergedCoverage = await mergeCoverageMaps([
		clientCoverage,
		serverCoverage,
	]);
	generateCoverageReport({
		dir: path.join(coverageDir, "report"),
		coverageMap: mergedCoverage,
	});
	baseLogger.info("Coverage report generated");
};

const prepareCoverageEnv = async () => {
	if (!process.env.COVERAGE) {
		return;
	}
	if (
		await fs.access(coverageDir).then(
			() => true,
			() => false,
		)
	) {
		await fs.rm(coverageDir, { recursive: true, force: true });
		await fs.mkdir(coverageDir);
	}
};

const globalSetup = async () => {
	await prepareCoverageEnv();
	const httpServer = promisifyServer(createHTTPServer({ router: appRouter }));
	const url = await httpServer.listen(0);
	process.env.MANAGER_PORT = url.port;
	process.env.PLAYWRIGHT = "true";
	return async () => {
		handleErrors();
		await handleCoverage();
		await httpServer.close();
	};
};

export default globalSetup;
