import { createFileRoute } from "@tanstack/react-router";
import * as fs from "node:fs/promises";
import path from "node:path";
import { stopCoverage, takeCoverage } from "node:v8";

import { mapV8Coverage, mergeCoverageMaps } from "~utils/server/coverage";
import { env } from "~web/utils/env";

const rootDir = path.join(import.meta.dirname, "../../../../..");

// oxlint-disable-next-line func-style
async function* getCoverage() {
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
		yield* mapV8Coverage(
			JSON.parse(
				await fs.readFile(path.join(serverCoveragePath, serverFile), "utf8"),
			) as Parameters<typeof mapV8Coverage>[0],
			rootDir,
		);
	}
}

export const Route = createFileRoute("/api/coverage")({
	server: {
		handlers: {
			POST: async () => {
				if (!env.PLAYWRIGHT) {
					return new Response(null, { status: 404 });
				}
				takeCoverage();
				stopCoverage();
				const coverageData = await mergeCoverageMaps(getCoverage());
				return Response.json(coverageData.data);
			},
		},
	},
});
