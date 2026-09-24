import istanbulCoverage from "istanbul-lib-coverage";
import type { CoverageMap, CoverageMapData } from "istanbul-lib-coverage";
import { createContext as createCoverageContext } from "istanbul-lib-report";
import reports from "istanbul-reports";
import * as fs from "node:fs/promises";
import type { Profiler } from "node:inspector";
import type { Module } from "node:module";
import path from "node:path";
import { fromEntries, isNonNullish } from "remeda";

import type { PlaywrightCoverageEntry } from "./loaders";
import { loadBrowserScript, loadNodeScript } from "./loaders";
import {
	isIgnoredScript,
	isReportedFile,
	rootDir,
	toAbsolutePath,
} from "./paths";
import type { ProjectorOptions } from "./projector";
import { createProjector } from "./projector";
import { getSkeleton } from "./skeleton";

// All coverage below is canonical:
// keyed by repository-relative paths, with statement / function / branch maps
// derived from the original source (see `skeleton.ts`), so any sources merge exactly.

const copyCoverageData = (
	source: CoverageMap | CoverageMapData,
	mapPath = (repoPath: string) => repoPath,
) => {
	const coverageMap = istanbulCoverage.createCoverageMap(source);
	return fromEntries(
		coverageMap.files().map((repoPath) => {
			const nextPath = mapPath(repoPath);
			return [
				nextPath,
				{
					...structuredClone(coverageMap.fileCoverageFor(repoPath).data),
					path: nextPath,
				},
			];
		}),
	) satisfies CoverageMapData;
};

export type NodeV8Coverage = {
	result: Profiler.ScriptCoverage[];
	"source-map-cache"?: Record<string, { data?: Module.SourceMapPayload }>;
};

// Reads coverage written by a Node process started with `NODE_V8_COVERAGE`
export const fromNodeV8Coverage = async (
	coverage: NodeV8Coverage,
	options?: ProjectorOptions,
) => {
	const projector = createProjector(options);
	const { result, "source-map-cache": sourceMaps = {} } = coverage;
	for (const script of result) {
		const sourceMap = sourceMaps[script.url]?.data;
		if (!sourceMap || isIgnoredScript(script.url)) {
			continue;
		}
		await projector.add(
			script.url,
			() => loadNodeScript(script.url, sourceMap),
			script.functions,
		);
	}
	return projector.toCoverageMap();
};

// Maps coverage collected with `page.coverage.stopJSCoverage()`
export const fromPlaywrightCoverage = async (
	entries: PlaywrightCoverageEntry[],
	options?: ProjectorOptions,
) => {
	const projector = createProjector(options);
	for (const entry of entries) {
		// Inline scripts have no source maps
		if (path.extname(new URL(entry.url).pathname) === "") {
			continue;
		}
		await projector.add(
			entry.url,
			() => loadBrowserScript(entry),
			entry.functions,
		);
	}
	return projector.toCoverageMap();
};

// Zero coverage for every file in given directories, so files never loaded are reported too
export const getEmptyCoverage = async (directories: string[]) => {
	const coverageMap = istanbulCoverage.createCoverageMap();
	for (const directory of directories) {
		const files = await fs.readdir(path.join(rootDir, directory), {
			recursive: true,
		});
		for (const file of files) {
			const repoPath = path.posix.join(
				directory,
				file.split(path.sep).join("/"),
			);
			if (!isReportedFile(repoPath)) {
				continue;
			}
			const skeleton = await getSkeleton(repoPath);
			if (skeleton) {
				coverageMap.addFileCoverage(skeleton.coverage);
			}
		}
	}
	return coverageMap;
};

export const mergeCoverageMaps = async (
	sources:
		| Iterable<CoverageMap | CoverageMapData>
		| AsyncIterable<CoverageMap | CoverageMapData>,
) => {
	const coverageMap = istanbulCoverage.createCoverageMap();
	for await (const source of sources) {
		// `merge` adopts file coverage objects it doesn't have yet and mutates them on next merges,
		// so we pass a copy to keep the sources intact
		coverageMap.merge(copyCoverageData(source));
	}
	coverageMap.filter(isReportedFile);
	return coverageMap;
};

export const generateCoverageReport = ({
	dir,
	coverageMap,
	printConsole = false,
}: {
	dir: string;
	coverageMap: CoverageMap;
	printConsole?: boolean;
}) => {
	const coverageContext = createCoverageContext({
		dir,
		// Reporters read sources from disk by coverage paths
		coverageMap: istanbulCoverage.createCoverageMap(
			copyCoverageData(coverageMap, toAbsolutePath),
		),
	});
	for (const reporter of (
		[
			printConsole ? "text" : undefined,
			"html",
			"lcovonly",
			"json",
			"json-summary",
		] as const
	).filter(isNonNullish)) {
		reports.create(reporter).execute(coverageContext);
	}
};
