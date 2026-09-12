import remapping from "@ampproject/remapping";
import type { SourceMapInput } from "@ampproject/remapping";
import type { Coverage } from "@playwright/test";
import convert from "ast-v8-to-istanbul";
import type { CoverageMapData } from "istanbul-lib-coverage";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseAstAsync } from "rolldown/parseAst";

import { serverFixtures as test } from "./server";

type CoverageFixtures = {
	coverage: void;
};
type RawSourceMap = { sources: string[]; [key: string]: unknown };

export const mapJsCoverage = async (
	coverage: Awaited<ReturnType<Coverage["stopJSCoverage"]>>,
): Promise<CoverageMapData[]> => {
	/* AGENT TASK */
	/* Remap this coverage to CoverageMapData */
	const baselinePath =
		/(?:\/|^)(?:node_modules|__tests__|__snapshots__)(?:\/|$)/;
	const rootDir = path.join(import.meta.dirname, "../../../");
	// oxlint-disable-next-line unicorn/consistent-function-scoping
	const resolveMapSource = (source: string, parent: string) => {
		try {
			return new URL(source, parent).href;
		} catch {
			return source;
		}
	};
	const readSourceMap = async (
		source: string,
	): Promise<RawSourceMap | undefined> => {
		try {
			const sourcePath = source.startsWith("file:")
				? fileURLToPath(source)
				: path.join(
						rootDir,
						"apps/web/.output/public",
						new URL(source).pathname.replace(/^\//, ""),
					);
			return JSON.parse(
				await fs.readFile(`${sourcePath}.map`, "utf8"),
			) as RawSourceMap;
		} catch {
			return undefined;
		}
	};
	return Promise.all(
		coverage
			.filter((entry) => !baselinePath.test(entry.url))
			.map(async (entry) => {
				const code = entry.source ?? "";
				const bundlePath = path.join(
					rootDir,
					"apps/web/.output/public",
					new URL(entry.url).pathname.replace(/^\//, ""),
				);
				const bundleUrl = pathToFileURL(bundlePath).href;
				const sourceMap = await readSourceMap(bundleUrl);
				if (sourceMap) {
					const nestedMaps = new Map<string, RawSourceMap>();
					for (const source of sourceMap.sources) {
						const sourceUrl = resolveMapSource(source, bundleUrl);
						const nestedMap = await readSourceMap(sourceUrl);
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
								resolveMapSource(source, bundleUrl),
							),
						} as never,
						(source) =>
							(nestedMaps.get(source) as SourceMapInput | undefined) ?? null,
						{ excludeContent: true },
					) as unknown as SourceMapInput;
					return convert({
						code,
						sourceMap: resolvedSourceMap as never,
						coverage: { ...entry, url: bundleUrl },
						ast: await parseAstAsync(code),
					});
				}
				return convert({
					code,
					coverage: { ...entry, url: bundleUrl },
					ast: await parseAstAsync(code),
				});
			}),
	);
	/* AGENT TASK END */
};

export const coverageFixtures = test.extend<CoverageFixtures>({
	coverage: [
		async ({ page, serverClient }, use, testInfo) => {
			if (
				testInfo.project.name !== "functional" ||
				testInfo.project.use.javaScriptEnabled === false
			) {
				return use();
			}
			await page.coverage.startJSCoverage({ resetOnNavigation: false });
			await use();
			const jsCoverage = await page.coverage.stopJSCoverage();
			await serverClient.addCoverage.mutate(await mapJsCoverage(jsCoverage));
		},
		{ scope: "test", auto: true },
	],
});
