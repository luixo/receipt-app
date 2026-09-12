import remapping from "@ampproject/remapping";
import type { SourceMapInput } from "@ampproject/remapping";
import convert from "ast-v8-to-istanbul";
import type { CoverageMapData } from "istanbul-lib-coverage";
import * as fs from "node:fs/promises";
import type { Profiler } from "node:inspector";
import type { Module } from "node:module";
import { fileURLToPath } from "node:url";
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
	const baselinePath =
		/(?:\/|^)(?:node_modules|__tests__|__snapshots__)(?:\/|$)/;
	// oxlint-disable-next-line unicorn/consistent-function-scoping
	const resolveMapSource = (source: string, parent: string) => {
		try {
			return new URL(source, parent).href;
		} catch {
			return source;
		}
	};
	return Promise.all(
		coverage.result
			.filter(
				(entry) =>
					entry.url.startsWith("file:") && !baselinePath.test(entry.url),
			)
			.map(async (entry) => {
				const code = await fs.readFile(fileURLToPath(entry.url), "utf8");
				const sourceMap = coverage["source-map-cache"][entry.url]?.data;
				if (sourceMap) {
					const nestedMaps = new Map<string, unknown>();
					for (const source of sourceMap.sources) {
						const sourceUrl = resolveMapSource(source, entry.url);
						const nestedMap = coverage["source-map-cache"][sourceUrl]?.data;
						if (nestedMap) {
							nestedMaps.set(sourceUrl, {
								...nestedMap,
								sources: nestedMap.sources.map((nestedSource) =>
									resolveMapSource(nestedSource, sourceUrl),
								),
							});
						}
					}
					const resolvedSourceMap = remapping(
						{
							...sourceMap,
							sources: sourceMap.sources.map((source) =>
								resolveMapSource(source, entry.url),
							),
						} as SourceMapInput,
						(source) =>
							(nestedMaps.get(source) as SourceMapInput | undefined) ?? null,
						{ excludeContent: true },
					) as unknown as SourceMapInput;
					return convert({
						code,
						sourceMap: resolvedSourceMap as never,
						coverage: entry,
						ast: await parseAstAsync(code),
					});
				}
				return convert({
					code,
					coverage: entry,
					ast: await parseAstAsync(code),
				});
			}),
	);
	/* AGENT TASK END */
};
