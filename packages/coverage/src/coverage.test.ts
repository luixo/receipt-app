import { TraceMap } from "@jridgewell/trace-mapping";
import istanbulCoverage from "istanbul-lib-coverage";
import type { FileCoverageData, Range } from "istanbul-lib-coverage";
import { spawn } from "node:child_process";
import { once } from "node:events";
import * as fs from "node:fs/promises";
import type { Profiler } from "node:inspector";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { entries, mapValues } from "remeda";
import { rolldown } from "rolldown";
import { beforeAll, describe, expect, test } from "vitest";

import type { NodeV8Coverage } from ".";
import { fromNodeV8Coverage, getEmptyCoverage, mergeCoverageMaps } from ".";
import { rootDir, toRepoPath } from "./paths";
import { createProjector } from "./projector";
import { getSkeleton } from "./skeleton";

const runNode = async (args: string[], env: Record<string, string> = {}) => {
	const child = spawn(process.execPath, args, {
		env: { NODE_ENV: "test", ...env },
		stdio: ["ignore", "pipe", "inherit"],
	});
	const chunks: Buffer[] = [];
	child.stdout.on("data", (chunk: Buffer) => {
		chunks.push(chunk);
	});
	const [exitCode] = (await once(child, "close")) as [number | null];
	if (exitCode !== 0) {
		throw new Error(`Node process exited with code ${String(exitCode)}`);
	}
	return Buffer.concat(chunks).toString("utf8");
};

const fixturesDir = path.join(import.meta.dirname, "fixtures");
const samplePath = "packages/coverage/src/fixtures/sample.ts";
const include = (repoPath: string) => repoPath === samplePath;
const sampleSource = await fs.readFile(
	path.join(fixturesDir, "sample.ts"),
	"utf8",
);
const sampleLines = sampleSource.split("\n");

const fileUrl = (repoPath: string) =>
	pathToFileURL(path.join(rootDir, repoPath)).href;

// Source text of a location, first line only
const getText = ({ start, end }: Range) =>
	sampleLines[start.line - 1]?.slice(
		start.column,
		start.line === end.line ? end.column : undefined,
	);

// Human-readable coverage: source text of every item with its count
const describeCoverage = (coverage: FileCoverageData) => ({
	statements: entries(coverage.statementMap).map(([id, range]) => [
		getText(range),
		coverage.s[id],
	]),
	functions: entries(coverage.fnMap).map(([id, fn]) => [
		getText(fn.decl),
		coverage.f[id],
	]),
	branches: entries(coverage.branchMap).map(([id, branch]) => [
		branch.type,
		getText(branch.loc),
		coverage.b[id],
	]),
});

// See `fixtures/entry.ts` for what is executed
const EXPECTED = {
	statements: [
		["(value: number, fallback = 10) => {", 1],
		["if (value > 5) {", 3],
		['return "big";', 1],
		['if (value < 0) return "negative";', 2],
		['return "negative";', 0],
		['if (value === 0) return "zero";', 2],
		['return "zero";', 1],
		['value % 2 ? "odd" : "even"', 1],
		['return (label === "odd" && fallback > 5) || label;', 1],
		["(a: number) => (b: number) => a + b", 1],
		["(b: number) => a + b", 1],
		["a + b", 0],
		['() => "never"', 1],
		['"never"', 0],
		["() => String(Math.random())", 1],
		["String(Math.random())", 0],
		['"box"', 1],
		["return new Box();", 1],
		['return [this.label, lazy()].join(" ");', 0],
		["(input: string) => {", 1],
		["switch (input) {", 3],
		["return 1;", 1],
		["return 2;", 2],
		["(value: boolean, suffix?: string) => {", 1],
		["if (value) {", 2],
		['return "early";', 2],
		['suffix === undefined ? "none" : suffix', 0],
		["return label.toUpperCase();", 0],
		["() => {", 1],
		["(globalThis as Record<string, unknown>).cleaned = true;", 2],
		["(fail: boolean) => {", 1],
		["try {", 2],
		["if (fail) {", 2],
		['throw new Error("fail");', 2],
		['return "ok";', 0],
		['return "caught";', 2],
		["cleanup();", 2],
		["(name: string) => {", 1],
		["() => name", 0],
		["name", 0],
		["return inner;", 0],
		["(value: number) => {", 1],
		["{}", 2],
		["return JSON.stringify([defaults, value]);", 2],
	],
	// Istanbul declaration of an anonymous function is its first character
	functions: [
		["(", 3],
		["(", 1],
		["(", 0],
		["(", 0],
		["(", 0],
		["p", 1],
		["p", 0],
		["(", 3],
		["(", 2],
		["(", 2],
		["(", 2],
		["(", 0],
		["(", 0],
		["(", 2],
	],
	branches: [
		["default-arg", "fallback = 10", [3]],
		["if", "if (value > 5) {", [1, 2]],
		["if", 'if (value < 0) return "negative";', [0, 2]],
		["if", 'if (value === 0) return "zero";', [1, 1]],
		["cond-expr", 'value % 2 ? "odd" : "even"', [1, 0]],
		["binary-expr", '(label === "odd" && fallback > 5) || label', [1, 1, 0]],
		["switch", "switch (input) {", [0, 1, 2]],
		["if", "if (value) {", [2, 0]],
		["cond-expr", 'suffix === undefined ? "none" : suffix', [0, 0]],
		["if", "if (fail) {", [2, 0]],
	],
};

// V8 block coverage of a script, taken via inspector as Playwright does
const INSPECTOR_RUNNER = `
import inspector from "node:inspector/promises";
import fs from "node:fs";
import vm from "node:vm";
const session = new inspector.Session();
session.connect();
await session.post("Profiler.enable");
await session.post("Profiler.startPreciseCoverage", { callCount: true, detailed: true });
const [file, url] = process.argv.slice(1);
vm.runInNewContext(fs.readFileSync(file, "utf8"), { Math }, { filename: url });
const { result } = await session.post("Profiler.takePreciseCoverage");
process.stdout.write(JSON.stringify(result.find((script) => script.url === url).functions));
`;

describe("coverage canonicalization", () => {
	let tmpDir = "";

	beforeAll(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "coverage-test-"));
		return () => fs.rm(tmpDir, { recursive: true, force: true });
	});

	const bundle = async (
		name: string,
		outputOptions: { format: "esm" | "iife"; minify: boolean },
	) => {
		const dir = path.join(tmpDir, name);
		const build = await rolldown({
			input: path.join(fixturesDir, "entry.ts"),
			logLevel: "silent",
		});
		const {
			output: [chunk],
		} = await build.write({ dir, sourcemap: true, ...outputOptions });
		return {
			file: path.join(dir, chunk.fileName),
			mapFile: path.join(dir, `${chunk.fileName}.map`),
		};
	};

	// Server-like: unminified ESM run by Node with `NODE_V8_COVERAGE`, source map recorded by Node
	const collectNodeCoverage = async () => {
		const { file } = await bundle("node", { format: "esm", minify: false });
		const coverageDir = path.join(tmpDir, "node-coverage");
		await runNode([file], { NODE_V8_COVERAGE: coverageDir });
		const [coverageFile] = await fs.readdir(coverageDir);
		if (!coverageFile) {
			throw new Error("Node did not produce a coverage file");
		}
		const data = await fs.readFile(
			path.join(coverageDir, coverageFile),
			"utf8",
		);
		return fromNodeV8Coverage(JSON.parse(data) as NodeV8Coverage, { include });
	};

	// Browser-like: minified IIFE, source map read from disk
	const collectBrowserCoverage = async () => {
		const { file, mapFile } = await bundle("browser", {
			format: "iife",
			minify: true,
		});
		const url = "http://localhost/assets/entry.js";
		const stdout = await runNode([
			"--input-type=module",
			"--eval",
			INSPECTOR_RUNNER,
			file,
			url,
		]);
		const projector = createProjector({ include });
		await projector.add(
			url,
			async () => ({
				code: await fs.readFile(file, "utf8"),
				map: new TraceMap(
					await fs.readFile(mapFile, "utf8"),
					pathToFileURL(mapFile).href,
				),
			}),
			JSON.parse(stdout) as Profiler.FunctionCoverage[],
		);
		return projector.toCoverageMap();
	};

	const getSampleCoverage = (coverageMap: istanbulCoverage.CoverageMap) => {
		expect(coverageMap.files()).toStrictEqual([samplePath]);
		return coverageMap.fileCoverageFor(samplePath).data;
	};

	test("node coverage (unminified ESM)", async () => {
		const coverage = getSampleCoverage(await collectNodeCoverage());
		expect(describeCoverage(coverage)).toStrictEqual(EXPECTED);
	});

	test("browser coverage (minified IIFE)", async () => {
		const coverage = getSampleCoverage(await collectBrowserCoverage());
		expect(describeCoverage(coverage)).toStrictEqual(EXPECTED);
	});

	test("coverages share the shape and merge by summing counts", async () => {
		const [nodeCoverageMap, browserCoverageMap] = await Promise.all([
			collectNodeCoverage(),
			collectBrowserCoverage(),
		]);
		const node = getSampleCoverage(nodeCoverageMap);
		const browser = getSampleCoverage(browserCoverageMap);
		expect(browser.statementMap).toStrictEqual(node.statementMap);
		expect(browser.fnMap).toStrictEqual(node.fnMap);
		expect(browser.branchMap).toStrictEqual(node.branchMap);

		const reported = await mergeCoverageMaps([
			nodeCoverageMap,
			browserCoverageMap,
		]);
		expect(reported.files()).toStrictEqual([samplePath]);

		const merged = istanbulCoverage.createFileCoverage(structuredClone(node));
		merged.merge(structuredClone(browser));
		expect(merged.data.statementMap).toStrictEqual(node.statementMap);
		expect(merged.data.s).toStrictEqual(
			mapValues(node.s, (count, id) => count + (browser.s[id] ?? 0)),
		);
		expect(merged.data.b).toStrictEqual(
			mapValues(node.b, (counts, id) =>
				counts.map((count, index) => count + (browser.b[id]?.[index] ?? 0)),
			),
		);
		// Sources are not mutated by merging
		expect(getSampleCoverage(nodeCoverageMap)).toStrictEqual(node);
	});

	test("empty coverage has the same shape with zero counts", async () => {
		const coverageDir = "packages/coverage/src";
		const empty = await getEmptyCoverage([coverageDir]);
		expect(empty.files()).toContain(`${coverageDir}/index.ts`);
		expect(empty.files()).toContain(samplePath);

		const node = getSampleCoverage(await collectNodeCoverage());
		const skeleton = await getSkeleton(samplePath);
		expect(skeleton?.coverage).toStrictEqual({
			...node,
			s: mapValues(node.s, () => 0),
			f: mapValues(node.f, () => 0),
			b: mapValues(node.b, (counts) => counts.map(() => 0)),
		});
	});
});

describe("repository paths", () => {
	test("sources are resolved to repository paths", () => {
		expect(toRepoPath(fileUrl("apps/web/src/app.tsx"))).toBe(
			"apps/web/src/app.tsx",
		);
		// Query is dropped, e.g. for TanStack Router split components
		expect(
			toRepoPath(
				`${fileUrl("apps/web/src/pages/index.tsx")}?tsr-split=component`,
			),
		).toBe("apps/web/src/pages/index.tsx");
		expect(toRepoPath(fileUrl("node_modules/react/index.js"))).toBeUndefined();
		expect(
			toRepoPath(fileUrl("apps/web/.output/server/index.mjs")),
		).toBeUndefined();
		expect(toRepoPath(fileUrl("apps/web/src/app.css"))).toBeUndefined();
		expect(toRepoPath("virtual:uniwind")).toBeUndefined();
		expect(toRepoPath("file:///outside/of/repository.ts")).toBeUndefined();
	});
});
