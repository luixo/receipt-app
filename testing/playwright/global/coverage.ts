import type { CoverageMap, CoverageMapData } from "istanbul-lib-coverage";
import fs from "node:fs/promises";
import path from "node:path";
import { values } from "remeda";

import {
	generateCoverageReport as genericGenerateCoverageReport,
	mergeCoverageMaps,
} from "~utils/server/coverage";
import { baseLogger } from "~web/providers/logger";

const localDir = import.meta.dirname;
const rootDir = path.join(localDir, "../../../");
const coverageDir = path.join(rootDir, "testing/playwright/coverage");

export const prepareCoverageEnv = async () => {
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

export const generateCoverageReport = async (
	data: Record<string, CoverageMap | CoverageMapData>,
) => {
	baseLogger.info("Start generating coverage report");
	const coverageMap = await mergeCoverageMaps(values(data));
	await fs.mkdir(path.join(coverageDir, "data"), { recursive: true });
	await fs.writeFile(
		path.join(coverageDir, "data/total-coverage.json"),
		JSON.stringify(coverageMap.data),
	);
	genericGenerateCoverageReport({
		dir: path.join(coverageDir, "report"),
		coverageMap,
	});
	baseLogger.info("Coverage report done");
};
