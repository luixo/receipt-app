import type { ParserPlugin } from "@babel/parser";
import { parse } from "@babel/parser";
import type { FileCoverageData } from "istanbul-lib-coverage";
import { createInstrumenter } from "istanbul-lib-instrument";
import * as fs from "node:fs/promises";
import { entries, isNonNullish, values } from "remeda";

import { baseLogger } from "~web/providers/logger";

import { toAbsolutePath } from "./paths";
import type { Position, Span } from "./source-map";
import { comparePositions, isSpanInside } from "./source-map";

// How to get a count for a branch arm from V8 data
export type ArmProbe =
	// Count of the code in the span
	| { span: Span }
	// Implicit `else`: how many times the `if` ran minus how many times its consequent ran
	| { whole: Span; minus: Span };

// Istanbul coverage for an original file with zero counts,
// plus the original spans to query V8 counts for every statement, function and branch arm.
export type FileSkeleton = {
	// Source text the skeleton is built from
	code: string;
	coverage: FileCoverageData;
	// Following statements of the same statement list, to borrow a count from
	// when a bundler removed the statement (see `planFile`)
	statements: [id: string, span: Span, followingSpans: Span[]][];
	// Span of the whole function node, if the AST pass found it
	functions: [id: string, spans: { body: Span; node?: Span }][];
	branches: [id: string, arms: ArmProbe[]][];
	// Full spans of every function in the file
	functionSpans: Span[];
};

type AstNode = { type: string; loc?: Span | null };

const isAstNode = (value: unknown): value is AstNode =>
	typeof value === "object" &&
	value !== null &&
	typeof (value as { type?: unknown }).type === "string";

const walk = (node: AstNode, visit: (node: AstNode) => void) => {
	visit(node);
	for (const child of values(node).flat()) {
		if (isAstNode(child)) {
			walk(child, visit);
		}
	}
};

const toSpan = ({ start, end }: Span): Span => ({
	start: { line: start.line, column: start.column },
	end: { line: end.line, column: end.column },
});

const positionKey = ({ line, column }: Position) => `${line}:${column}`;

const getParserPlugins = (repoPath: string): ParserPlugin[] => {
	if (/\.[cm]?tsx$/.test(repoPath)) {
		return ["typescript", "jsx"];
	}
	if (/\.[cm]?ts$/.test(repoPath)) {
		return ["typescript"];
	}
	return ["jsx"];
};

// Istanbul's maps don't have everything we need to query V8 data:
// - function map stores the body span, but not where the function node starts
// - `if` branch stores the whole statement as consequent location and nothing for an implicit `else`
const collectAstDetails = (code: string, plugins: ParserPlugin[]) => {
	const functionSpansByBody = new Map<string, Span>();
	const ifStatements = new Map<
		string,
		{ consequent: Span; alternate?: Span }
	>();
	const statementLists: Span[][] = [];
	walk(
		parse(code, {
			sourceType: "module",
			allowReturnOutsideFunction: true,
			allowImportExportEverywhere: true,
			plugins,
		}).program,
		(node) => {
			const { loc } = node;
			if (!loc) {
				return;
			}
			if (
				"body" in node &&
				isAstNode(node.body) &&
				node.body.loc &&
				/Function|Method/.test(node.type)
			) {
				functionSpansByBody.set(positionKey(node.body.loc.start), toSpan(loc));
			}
			const statements =
				node.type === "SwitchCase"
					? (node as AstNode & { consequent: AstNode[] }).consequent
					: /^(?:Program|BlockStatement|StaticBlock)$/.test(node.type)
						? (node as AstNode & { body: AstNode[] }).body
						: undefined;
			if (statements) {
				statementLists.push(
					statements
						.map((statement) => statement.loc)
						.filter(isNonNullish)
						.map(toSpan),
				);
			}
			if (node.type === "IfStatement") {
				const { consequent, alternate } = node as AstNode & {
					consequent: AstNode;
					alternate: AstNode | null;
				};
				if (consequent.loc) {
					ifStatements.set(positionKey(loc.start), {
						consequent: toSpan(consequent.loc),
						alternate: alternate?.loc ? toSpan(alternate.loc) : undefined,
					});
				}
			}
		},
	);
	return { functionSpansByBody, ifStatements, statementLists };
};

// Statements after the innermost list statement containing the span
// (istanbul statement may be a part of it, e.g. an initializer of a variable declaration).
// None if the statement is inside a function nested in that list statement:
// e.g. an arrow body `const Wrapper = () => <Page />` runs only when the function is called
const getFollowingSpans = (
	statementLists: Span[][],
	functionSpans: Span[],
	span: Span,
) => {
	const [innermost] = statementLists
		.map((list) => ({
			list,
			index: list.findIndex((statement) => isSpanInside(span, statement)),
		}))
		.filter(({ index }) => index !== -1)
		// Nested list statements start later
		.toSorted((a, b) =>
			// oxlint-disable-next-line typescript/no-non-null-assertion
			comparePositions(b.list[b.index]!.start, a.list[a.index]!.start),
		);
	if (!innermost) {
		return [];
	}
	// oxlint-disable-next-line typescript/no-non-null-assertion
	const listStatement = innermost.list[innermost.index]!;
	const isInNestedFunction = functionSpans.some(
		(functionSpan) =>
			isSpanInside(span, functionSpan) &&
			!isSpanInside(functionSpan, span) &&
			isSpanInside(functionSpan, listStatement),
	);
	return isInNestedFunction ? [] : innermost.list.slice(innermost.index + 1);
};

// Istanbul marks a missing location with `{ start: {}, end: {} }`
const isDefinedSpan = (span: {
	start: Partial<Position>;
	end: Partial<Position>;
}): span is Span =>
	span.start.line !== undefined && span.end.line !== undefined;

const createSkeleton = async (repoPath: string): Promise<FileSkeleton> => {
	const code = await fs.readFile(toAbsolutePath(repoPath), "utf8");
	const plugins = getParserPlugins(repoPath);
	const instrumenter = createInstrumenter({
		esModules: true,
		parserPlugins: plugins,
	});
	// Async `instrument` is a callback wrapper around the same synchronous work
	// oxlint-disable-next-line node/no-sync
	instrumenter.instrumentSync(code, repoPath);
	const { path, statementMap, fnMap, branchMap, s, f, b } =
		instrumenter.lastFileCoverage();
	const { functionSpansByBody, ifStatements, statementLists } =
		collectAstDetails(code, plugins);

	return {
		code,
		coverage: { path, statementMap, fnMap, branchMap, s, f, b },
		statements: entries(statementMap).map(([id, span]) => [
			id,
			toSpan(span),
			getFollowingSpans(
				statementLists,
				[...functionSpansByBody.values()],
				toSpan(span),
			),
		]),
		functions: entries(fnMap).map(([id, fn]) => [
			id,
			{
				body: toSpan(fn.loc),
				node: functionSpansByBody.get(positionKey(fn.loc.start)),
			},
		]),
		branches: entries(branchMap).map(([id, branch]): [string, ArmProbe[]] => {
			const ifStatement =
				branch.type === "if" && branch.locations.length === 2
					? ifStatements.get(positionKey(branch.loc.start))
					: undefined;
			if (ifStatement) {
				const whole = toSpan(branch.loc);
				return [
					id,
					[
						{ span: ifStatement.consequent },
						ifStatement.alternate
							? { span: ifStatement.alternate }
							: { whole, minus: ifStatement.consequent },
					],
				];
			}
			return [
				id,
				branch.locations.map((location) => ({
					span: toSpan(isDefinedSpan(location) ? location : branch.loc),
				})),
			];
		}),
		functionSpans: [...functionSpansByBody.values()],
	};
};

const skeletons = new Map<string, Promise<FileSkeleton | undefined>>();

// Every coverage source for a file is projected onto the same skeleton,
// so resulting coverages have identical maps and merge exactly.
export const getSkeleton = (repoPath: string) => {
	let skeleton = skeletons.get(repoPath);
	if (!skeleton) {
		skeleton = createSkeleton(repoPath).catch((error: unknown) => {
			baseLogger.warn(`Skipping coverage for ${repoPath}: ${String(error)}`);
			return undefined;
		});
		skeletons.set(repoPath, skeleton);
	}
	return skeleton;
};
