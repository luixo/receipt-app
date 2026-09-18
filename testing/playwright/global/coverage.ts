import type { CoverageMap, CoverageMapData } from "istanbul-lib-coverage";
import fs from "node:fs/promises";
import path from "node:path";
import { entries, keys } from "remeda";

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
	baseLogger.info(
		`Writing coverage chunks: ${entries(data)
			.map(([name, coverage]) => `${name}=${keys(coverage.data).length}`)
			.join(", ")}`,
	);
	await fs.mkdir(path.join(coverageDir, "data"), { recursive: true });
	for (const [name, coverage] of entries(data)) {
		await fs.writeFile(
			path.join(coverageDir, `data/${name}-coverage.json`),
			JSON.stringify(coverage.data),
		);
	}
};
