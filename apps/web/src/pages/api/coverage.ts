import { createFileRoute } from "@tanstack/react-router";
import * as fs from "node:fs/promises";
import path from "node:path";
import { stopCoverage, takeCoverage } from "node:v8";

import { env } from "~web/utils/env";

const getCoverage = async () => {
	const serverCoveragePath = env.NODE_V8_COVERAGE;
	if (!serverCoveragePath) {
		throw new Error(
			"Expected to have NODE_V8_COVERAGE when coverage is called",
		);
	}
	const serverFiles = await fs.readdir(serverCoveragePath).catch(() => []);
	if (serverFiles.length === 0) {
		throw new Error(
			"Expected to have at least one coverage file when coverage is called",
		);
	}
	for (const serverFile of serverFiles) {
		if (!serverFile.endsWith(".json")) {
			continue;
		}
		return fs.readFile(path.join(serverCoveragePath, serverFile), "utf8");
	}
};

// Flushes V8 coverage to `NODE_V8_COVERAGE` directory, it is processed by the test runner
export const Route = createFileRoute("/api/coverage")({
	server: {
		handlers: {
			POST: async () => {
				if (!env.PLAYWRIGHT) {
					return new Response(null, { status: 404 });
				}
				if (!env.NODE_V8_COVERAGE) {
					throw new Error(
						"Expected to have NODE_V8_COVERAGE when coverage is called",
					);
				}
				takeCoverage();
				stopCoverage();
				return new Response(await getCoverage());
			},
		},
	},
});
