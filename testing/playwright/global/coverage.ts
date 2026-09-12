import convert from "ast-v8-to-istanbul";
import libCoverage from "istanbul-lib-coverage";
import type { CoverageMapData } from "istanbul-lib-coverage";
import libReport from "istanbul-lib-report";
import reports from "istanbul-reports";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseAstAsync } from "rolldown/parseAst";

const localDir = import.meta.dirname;
const rootDir = path.join(localDir, "../../../");
const playwrightDir = path.join(rootDir, "testing/playwright");
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

const isIncluded = (filePath: string) => {
	const relativePath = path.relative(rootDir, filePath);
	return (
		INCLUDED_DIRS.some(
			(dir) => relativePath === dir || relativePath.startsWith(`${dir}/`),
		) &&
		!IGNORED_PATHS.some((ignored) =>
			typeof ignored === "string"
				? ignored === relativePath
				: ignored.test(relativePath),
		)
	);
};

const getProjectFiles = async (directory: string): Promise<string[]> => {
	const entries = await fs.readdir(directory, { withFileTypes: true });
	const files = await Promise.all(
		entries.map(async (entry) => {
			const filePath = path.join(directory, entry.name);
			return entry.isDirectory() ? getProjectFiles(filePath) : [filePath];
		}),
	);
	return files.flat();
};

export const prepareCoverageEnv = async () => {
	await fs.rm(clientCoverageDir, { recursive: true, force: true });
	await fs.mkdir(clientCoverageDir);
	await fs.rm(serverCoverageDir, { recursive: true, force: true });
	await fs.mkdir(serverCoverageDir);
};

export const generateCoverageReport = async (coverage: {
	client: CoverageMapData[];
	server: CoverageMapData[];
}) => {
	// oxlint-disable-next-line no-console
	console.log(
		`Generating coverage from ${coverage.client.length} client and ${coverage.server.length} server data points`,
	);
	const coverageMap = libCoverage.createCoverageMap();
	for (const data of [...coverage.client, ...coverage.server]) {
		coverageMap.merge(data);
	}
	if (process.env.COVERAGE_ALL === "true") {
		const existingFiles = new Set(coverageMap.files());
		for (const directory of INCLUDED_DIRS) {
			for (const filePath of await getProjectFiles(
				path.join(rootDir, directory),
			)) {
				const fileUrl = pathToFileURL(filePath).href;
				if (
					/\.[cm]?[jt]sx?$/.test(filePath) &&
					isIncluded(filePath) &&
					!existingFiles.has(fileUrl)
				) {
					const code = await fs.readFile(filePath, "utf8");
					coverageMap.merge(
						await convert({
							code,
							coverage: { url: fileUrl, functions: [] },
							ast: await parseAstAsync(code, {
								lang: filePath.endsWith(".tsx")
									? "tsx"
									: filePath.endsWith(".ts")
										? "ts"
										: "js",
							}),
						}),
					);
					existingFiles.add(fileUrl);
				}
			}
		}
	}
	coverageMap.filter((filePath) => 
		isIncluded(filePath)
	);
	const coverageContext = libReport.createContext({
		dir: clientCoverageDir,
		coverageMap,
	});
	for (const reporter of ["html", "lcovonly"] as const) {
		reports.create(reporter).execute(coverageContext);
	}
};
