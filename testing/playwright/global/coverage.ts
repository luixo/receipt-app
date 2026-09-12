import { createCoverageMap } from "istanbul-lib-coverage";
import type { CoverageMapData } from "istanbul-lib-coverage";
import { createContext as createCoverageContext } from "istanbul-lib-report";
import reports from "istanbul-reports";
import fs from "node:fs/promises";
import path from "node:path";

const localDir = import.meta.dirname;
const rootDir = path.join(localDir, "../../../");
const playwrightDir = path.join(rootDir, "testing/playwright");
const webPublicDir = path.join(rootDir, "apps/web/.output/public");

const clientCoverageDir = path.join(playwrightDir, "coverage");
const serverCoverageDir = path.join(playwrightDir, "coverage-server");

const INCLUDED_DIRS = [
	"apps/web/src",
	"packages/app",
	"packages/mutations",
	"packages/utils",
];

const IGNORED_PATHS = [
	"__vite-browser-external",
	/node_modules/,
	/\.d\.ts$/,
	/__tests__/,
	/__snapshots__/,
	// Handlers coverage is verified in backend tests
	/^apps\/web\/src\/handlers\//,
	/apps\/web\/src\/app.css/,
];

export const prepareCoverageEnv = async () => {
	await fs.rm(clientCoverageDir, { recursive: true, force: true });
	await fs.mkdir(clientCoverageDir);
	await fs.rm(serverCoverageDir, { recursive: true, force: true });
	await fs.mkdir(serverCoverageDir);
};

export const generateCoverageReport = (coverage: {
	client: CoverageMapData[];
	server: CoverageMapData[];
}) => {
	// oxlint-disable-next-line no-console
	console.log(
		`Generating coverage from ${coverage.client.length} client and ${coverage.server.length} server data points`,
	);
	const coverageMap = createCoverageMap();
	for (const data of [...coverage.client, ...coverage.server]) {
		coverageMap.merge(data);
	}
	const coverageContext = createCoverageContext({
		dir: clientCoverageDir,
		coverageMap,
	});
	for (const reporter of ["html", "lcovonly"] as const) {
		reports.create(reporter).execute(coverageContext);
	}
};
