import type { CoverageMapData } from "istanbul-lib-coverage";
import * as fs from "node:fs/promises";
import path from "node:path";
import { isNonNullish, keys } from "remeda";

import {
	generateCoverageReport,
	getEmptyCoverage,
	mergeCoverageMaps,
} from "~utils/server/coverage";
import { baseLogger } from "~web/providers/logger";

const rootDir = path.join(import.meta.dirname, "../..");
const coverageDir = path.join(rootDir, "frontend-coverage");

const INCLUDED_DIRS = [
	"apps/web/src",
	"packages/app",
	"packages/mutations",
	"packages/utils",
];

const getCoverageFiles = async (directory: string): Promise<string[]> => {
	const entries = await fs.readdir(directory, { recursive: true });
	return entries
		.map((entry) => {
			if (
				!/^(?:client|server)-coverage\.json$/.test(path.basename(entry)) &&
				path.basename(entry) !== "coverage-final.json"
			) {
				return undefined;
			}
			return path.join(directory, entry);
		})
		.filter(isNonNullish);
};

const coverageFiles = await getCoverageFiles(coverageDir);
baseLogger.info(`Found coverage files:\n${coverageFiles.join("\n")}`);
// oxlint-disable-next-line func-style
async function* getCoverageMap() {
	for (const coverageFile of coverageFiles) {
		const coverage = JSON.parse(
			await fs.readFile(coverageFile, "utf8"),
		) as CoverageMapData;
		baseLogger.info(
			`Read ${path.basename(coverageFile)}: ${keys(coverage).length} entries`,
		);
		yield coverage;
	}
	yield* getEmptyCoverage(INCLUDED_DIRS);
}
const coverageMap = await mergeCoverageMaps(getCoverageMap());
baseLogger.info(`Merged coverage entries: ${coverageMap.files().length}`);
baseLogger.info(
	`Total coverage:\n${JSON.stringify(coverageMap.getCoverageSummary(), null, 2)}`,
);
await generateCoverageReport({
	dir: path.join(rootDir, "testing/playwright/coverage/report"),
	coverageMap,
});
