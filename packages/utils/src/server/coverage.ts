import type { EncodedSourceMap } from "@ampproject/remapping";
import remapping from "@ampproject/remapping";
import type { Coverage as PlaywrightCoverage } from "@playwright/test";
import convert from "ast-v8-to-istanbul";
import istanbulCoverage from "istanbul-lib-coverage";
import type { CoverageMap, CoverageMapData } from "istanbul-lib-coverage";
import { createContext as createCoverageContext } from "istanbul-lib-report";
import reports from "istanbul-reports";
import * as fs from "node:fs/promises";
import type { Profiler } from "node:inspector";
import type { Module } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { fromEntries, isNonNullish, entries as objectEntries } from "remeda";
import { parseAstAsync } from "rolldown/parseAst";

import { baseLogger } from "~web/providers/logger";

const rootDir = path.join(import.meta.dirname, "../../../..");

const getBundlePath = (entryUrl: string) =>
	path.join(rootDir, "apps/web/.output/public", new URL(entryUrl).pathname);

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

const IGNORED_PATHS = [
	// No node_modules
	/node_modules/,
	// No internal node files
	/^node:/,
	// No bundles libs
	/server\/_libs/,
	// No locally evaluated code
	/evalmachine/,
	// No private modules
	/__vite-browser-external/,
	// No tests & snapshots
	/__tests__/,
	/__snapshots__/,
	// No declarations and non-covered types
	/\.d\.ts$/,
	/\.css$/,
	/\.css\?url$/,
	/\.json$/,
	// Handlers coverage is verified in backend tests
	/apps\/web\/src\/handlers\//,
];

export const mergeCoverageMaps = async (
	sources:
		| Iterable<CoverageMap | CoverageMapData>
		| AsyncIterable<CoverageMap | CoverageMapData>,
) => {
	const coverageMap = istanbulCoverage.createCoverageMap();
	for await (const source of sources) {
		coverageMap.merge(source);
	}
	coverageMap.filter((filePath) =>
		IGNORED_PATHS.every((ignoredPath) => !ignoredPath.test(filePath)),
	);
	return coverageMap;
};

// oxlint-disable-next-line func-style
export async function* mapV8Coverage(
	coverage: V8Coverage,
	repositoryRoot: string,
) {
	for (const entry of coverage.result) {
		if (
			!entry.url ||
			IGNORED_PATHS.some((lookupPath) => lookupPath.test(entry.url))
		) {
			continue;
		}
		const code = await fs.readFile(fileURLToPath(entry.url), "utf8");
		const sourceMap = coverage["source-map-cache"][entry.url]?.data;
		if (!sourceMap) {
			continue;
		}
		const sourceMaps = await Promise.all(
			sourceMap.sources.map(async (source) => {
				const sourceUrl = new URL(source, entry.url).href;
				const file = `${fileURLToPath(sourceUrl)}.map`;
				if (
					!(await fs.stat(file).then(
						() => true,
						() => false,
					))
				) {
					return;
				}
				const nestedMapRead = JSON.parse(
					await fs.readFile(file, "utf8"),
				) as Module.SourceMapPayload;
				return [sourceUrl, { ...nestedMapRead, version: 3 as const }] as const;
			}),
		);
		const resolvedSourceMap = remapping(
			{
				...sourceMap,
				version: 3 as const,
				sources: sourceMap.sources.map(
					(source) => new URL(source, entry.url).href,
				),
			},
			(source) => {
				const localSourceMap = sourceMaps
					.filter(isNonNullish)
					.find(([url]) => url === source)?.[1];
				return localSourceMap ?? null;
			},
			{ excludeContent: true },
		);
		yield await convert({
			code,
			sourceMap: {
				version: 3,
				file: resolvedSourceMap.file,
				names: resolvedSourceMap.names,
				sourceRoot: resolvedSourceMap.sourceRoot,
				sources: resolvedSourceMap.sources.map((source) =>
					source?.startsWith("file:")
						? pathToFileURL(
								path.resolve(
									repositoryRoot,
									path.relative(repositoryRoot, fileURLToPath(source)),
								),
							).href
						: source,
				),
				sourcesContent: resolvedSourceMap.sourcesContent,
				mappings: resolvedSourceMap.mappings as string,
			},
			coverage: entry,
			ast: await parseAstAsync(code),
		});
	}
}

type CoverageEntry = Awaited<
	ReturnType<PlaywrightCoverage["stopJSCoverage"]>
>[number];

export const mapJsCoverage = async (entries: CoverageEntry[]) => {
	baseLogger.info("Start js coverage mapping");
	const coverageMap = istanbulCoverage.createCoverageMap();
	for (const entry of entries) {
		if (path.extname(entry.url) === "") {
			continue;
		}
		const ast = await parseAstAsync(entry.source ?? "");
		const sourceMapPath = `${getBundlePath(entry.url)}.map`;
		const sourceMap = JSON.parse(
			await fs.readFile(sourceMapPath, "utf8"),
		) as EncodedSourceMap;
		coverageMap.merge(
			await convert({
				code: entry.source ?? "",
				sourceMap: {
					...sourceMap,
					sourceRoot: "",
					sources: sourceMap.sources.map((source) => {
						if (!source) {
							return source;
						}
						const sourcePath = source.replace(/\?.*$/, "");
						const absolutePath = sourcePath.startsWith("file:")
							? fileURLToPath(sourcePath)
							: path.resolve(path.dirname(sourceMapPath), sourcePath);
						return pathToFileURL(absolutePath).href;
					}),
				},
				coverage: {
					url: pathToFileURL(getBundlePath(entry.url)).href,
					functions: entry.functions,
				},
				ast,
			}),
		);
	}
	baseLogger.info(
		"End js coverage mapping",
		`${coverageMap.files().length} entries`,
		performance.now(),
	);
	coverageMap.filter((filePath) =>
		IGNORED_PATHS.every((ignoredPath) => !ignoredPath.test(filePath)),
	);
	return coverageMap;
};

// oxlint-disable-next-line func-style
export async function* getEmptyCoverage(directories: string[]) {
	for (const directory of directories) {
		const rawProjectFiles = await fs.readdir(path.join(rootDir, directory), {
			recursive: true,
		});
		const projectFiles = rawProjectFiles.filter(
			(entry) => path.extname(entry) !== "",
		);
		for (const projectFile of projectFiles) {
			const filePath = path.join(rootDir, directory, projectFile);
			if (!IGNORED_PATHS.every((ignoredPath) => !ignoredPath.test(filePath))) {
				continue;
			}
			const fileUrl = pathToFileURL(filePath).href;
			const code = await fs.readFile(filePath, "utf8");
			yield await convert({
				code,
				coverage: { url: fileUrl, functions: [] },
				ast: await parseAstAsync(code, {
					lang: filePath.endsWith("tsx") ? "tsx" : "ts",
				}),
			});
		}
	}
}

export const generateCoverageReport = ({
	dir,
	coverageMap,
	printConsole = false,
}: {
	dir: string;
	coverageMap: CoverageMap;
	printConsole?: boolean;
}) => {
	/* oxlint-disable node/no-process-env */
	const projectRoot = process.env.GITHUB_WORKSPACE ?? rootDir;
	/* oxlint-enable node/no-process-env */
	const repositoryMarker = `${path.sep}${path.basename(projectRoot)}${path.sep}${path.basename(projectRoot)}${path.sep}`;
	const normalizedCoverageMap = istanbulCoverage.createCoverageMap(
		fromEntries(
			objectEntries(coverageMap.data).map(([filePath, fileCoverage]) => {
				const markerIndex = filePath.lastIndexOf(repositoryMarker);
				if (markerIndex === -1) {
					return [filePath, fileCoverage];
				}
				return [
					path.join(
						projectRoot,
						filePath.slice(markerIndex + repositoryMarker.length),
					),
					fileCoverage,
				];
			}),
		),
	);
	const coverageContext = createCoverageContext({
		dir,
		coverageMap: normalizedCoverageMap,
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
		reports
			.create(reporter, reporter === "lcovonly" ? { projectRoot } : {})
			.execute(coverageContext);
	}
};
