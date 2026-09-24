import type { EncodedSourceMap } from "@ampproject/remapping";
import remapping from "@ampproject/remapping";
import { TraceMap } from "@jridgewell/trace-mapping";
import type { Coverage as PlaywrightCoverage } from "@playwright/test";
import * as fs from "node:fs/promises";
import type { Module } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { rootDir } from "./paths";

// A generated script as V8 executed it, with a source map to original files
export type LoadedScript = { code: string; map: TraceMap };

const readSourceMap = async (file: string) => {
	const content = await fs.readFile(file, "utf8").catch(() => undefined);
	return content === undefined
		? undefined
		: (JSON.parse(content) as EncodedSourceMap);
};

// Server bundle is built in two steps (Vite SSR build, then Nitro bundle),
// so the source map Node recorded may point to intermediate files with their own source maps.
export const loadNodeScript = async (
	scriptUrl: string,
	sourceMap: Module.SourceMapPayload,
): Promise<LoadedScript> => {
	const sources = sourceMap.sources.map(
		(source) => new URL(source, scriptUrl).href,
	);
	const nestedMaps = new Map(
		await Promise.all(
			sources.map(
				async (source) =>
					[
						source,
						await readSourceMap(`${fileURLToPath(source)}.map`),
					] as const,
			),
		),
	);
	const flattenedMap = remapping(
		{ ...sourceMap, version: 3, sources },
		(source) => nestedMaps.get(source) ?? null,
	);
	return {
		code: await fs.readFile(fileURLToPath(scriptUrl), "utf8"),
		map: new TraceMap(flattenedMap.toString()),
	};
};

export type PlaywrightCoverageEntry = Awaited<
	ReturnType<PlaywrightCoverage["stopJSCoverage"]>
>[number];

const clientBundleDir = path.join(rootDir, "apps/web/.output/public");

export const loadBrowserScript = async (
	entry: PlaywrightCoverageEntry,
): Promise<LoadedScript | undefined> => {
	const mapPath = `${path.join(clientBundleDir, new URL(entry.url).pathname)}.map`;
	const sourceMap = await readSourceMap(mapPath);
	if (!sourceMap || entry.source === undefined) {
		return;
	}
	return {
		code: entry.source,
		map: new TraceMap(sourceMap, pathToFileURL(mapPath).href),
	};
};
