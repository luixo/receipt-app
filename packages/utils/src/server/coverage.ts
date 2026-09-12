import convert from "ast-v8-to-istanbul";
import type { CoverageMapData } from "istanbul-lib-coverage";
import * as fs from "node:fs/promises";
import type { Profiler } from "node:inspector";
import type { Module } from "node:module";
import { parseAstAsync } from "rolldown/parseAst";

type V8Coverage = {
	result: Profiler.ScriptCoverage[];
	timestamp: number;
	"source-map-cache": Record<
		string,
		Module.SourceMapConstructorOptions & {
			data: Module.SourceMapPayload;
		}
	>;
};
export const mapV8Coverage = async (
	coverage: V8Coverage,
): Promise<CoverageMapData[]> => {
	/* AGENT TASK */
	/* Remap this coverage to CoverageMapData */
	return Promise.all(
		coverage.result.map(async (entry) => {
			const code = await fs.readFile(entry.url, "utf8");
			const sourceMap = coverage["source-map-cache"][entry.url]?.data;
			return convert({
				code,
				sourceMap,
				coverage: entry,
				ast: await parseAstAsync(code),
			});
		}),
	);
	/* AGENT TASK END */
};
