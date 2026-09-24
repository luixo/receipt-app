import type { CoverageMapData, Totals } from "istanbul-lib-coverage";
import * as fs from "node:fs/promises";
import path from "node:path";
import { capitalize, keys } from "remeda";

import {
	generateCoverageReport,
	getEmptyCoverage,
	mergeCoverageMaps,
} from "~coverage/index";
import { baseLogger } from "~web/providers/logger";

const rootDir = path.join(import.meta.dirname, "../..");
const coverageDir = path.join(rootDir, "testing/playwright/coverage");

const INCLUDED_DIRS = [
	"apps/web/src",
	"packages/app",
	"packages/mutations",
	"packages/utils",
];

const COVERAGE_FILES = new Set(["server.json", "client.json"]);

const getCoverageFiles = async (directory: string) => {
	const entries = await fs.readdir(directory, { recursive: true });
	return entries
		.filter((entry) => COVERAGE_FILES.has(path.basename(entry)))
		.map((entry) => path.join(directory, entry));
};

const coverageFiles = await getCoverageFiles(coverageDir);
if (coverageFiles.length === 0) {
	throw new Error("Expected to have at least one coverage file");
}
baseLogger.info(`Found ${coverageFiles.length} coverage files.`);
// oxlint-disable-next-line func-style
async function* getCoverageMap() {
	yield await getEmptyCoverage(INCLUDED_DIRS);
	for (const coverageFile of coverageFiles) {
		const coverage = JSON.parse(
			await fs.readFile(coverageFile, "utf8"),
		) as CoverageMapData;
		baseLogger.info(
			`Coverage in ${path.relative(rootDir, coverageFile)} with ${keys(coverage).length} files`,
		);
		yield coverage;
	}
}
const coverageMap = await mergeCoverageMaps(getCoverageMap());

const parseTotals = (totals: Totals) =>
	`${totals.pct}% (${totals.covered}/${totals.total})`;
const summary = coverageMap.getCoverageSummary();
const summaryElements = (
	["lines", "statements", "functions", "branches"] as const
).map((value) => `${capitalize(value)}: ${parseTotals(summary[value])}`);
baseLogger.info(`Total coverage:\n${summaryElements.join("\n")}`);
generateCoverageReport({
	dir: path.join(coverageDir, "report"),
	coverageMap,
});
