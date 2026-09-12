import { createFileRoute } from "@tanstack/react-router";
import * as fs from "node:fs/promises";
import path from "node:path";
import { stopCoverage, takeCoverage } from "node:v8";
import { flat } from "remeda";

import { mapV8Coverage } from "~utils/server/coverage";
import { env } from "~web/utils/env";

export const Route = createFileRoute("/api/coverage")({
	server: {
		handlers: {
			POST: async () => {
				if (!env.PLAYWRIGHT) {
					return new Response(null, { status: 404 });
				}
				takeCoverage();
				stopCoverage();
				const serverCoveragePath = process.env.NODE_V8_COVERAGE;
				if (!serverCoveragePath) {
					throw new Error(
						"Expected to have NODE_V8_COVERAGE when coverage is called",
					);
				}
				const serverFiles = await fs
					.readdir(serverCoveragePath)
					.catch(() => []);
				if (serverFiles.length === 0) {
					throw new Error(
						"Expected to have at least one coverage file when coverage is called",
					);
				}
				const coverage = flat(
					await Promise.all(
						serverFiles
							.filter((file) => file.endsWith(".json"))
							.map(async (file) =>
								mapV8Coverage(
									JSON.parse(
										await fs.readFile(
											path.join(serverCoveragePath, file),
											"utf8",
										),
									) as Parameters<typeof mapV8Coverage>[0],
								),
							),
					),
				);
				return Response.json({ coverage });
			},
		},
	},
});
