import { parse } from "@babel/parser";
import { values } from "remeda";

import { baseLogger } from "~web/providers/logger";

import { createSegmentLookup } from "./ranges";

type AstNode = { type: string; start?: number | null; end?: number | null };

type WithOffsets<T> = T & { start: number; end: number };

const isAstNode = (value: unknown): value is AstNode =>
	typeof value === "object" &&
	value !== null &&
	typeof (value as { type?: unknown }).type === "string";

const hasOffsets = <T extends AstNode>(node: T): node is WithOffsets<T> =>
	typeof node.start === "number" && typeof node.end === "number";

const FUNCTION_TYPES = new Set([
	"FunctionDeclaration",
	"FunctionExpression",
	"ArrowFunctionExpression",
	"ObjectMethod",
	"ClassMethod",
	"ClassPrivateMethod",
]);

type GeneratedFunction = {
	startOffset: number;
	// Offset to read the count of function calls at
	countOffset: number;
};

const getStatementList = (
	node: AstNode,
): { statements: unknown[]; end: number } | undefined => {
	if (!hasOffsets(node)) {
		return undefined;
	}
	if (
		node.type === "Program" ||
		node.type === "BlockStatement" ||
		node.type === "StaticBlock"
	) {
		return {
			statements: (node as unknown as { body: unknown[] }).body,
			end: node.end,
		};
	}
	if (node.type === "SwitchCase") {
		return {
			statements: (node as unknown as { consequent: unknown[] }).consequent,
			end: node.end,
		};
	}
	return undefined;
};

const collectAstDetails = (code: string) => {
	// Generated offsets where a continuation may start (ends of statements),
	// mapped to the end of the enclosing statement list - where it really ends
	const continuations = new Map<number, number>();
	// Ranges V8 reports for real blocks, even when they start where a statement ends
	const blockStarts = new Set<number>();
	const functions: (GeneratedFunction & {
		endOffset: number;
		parent?: number;
	})[] = [];
	const visit = (node: AstNode, parentFunction?: number) => {
		let currentFunction = parentFunction;
		const statementList = getStatementList(node);
		for (const statement of statementList?.statements ?? []) {
			if (statementList && isAstNode(statement) && hasOffsets(statement)) {
				continuations.set(
					statement.end,
					Math.max(continuations.get(statement.end) ?? 0, statementList.end),
				);
			}
		}
		if (node.type === "SwitchCase" && hasOffsets(node)) {
			blockStarts.add(node.start);
		}
		if (node.type === "IfStatement") {
			const { consequent, alternate } = node as AstNode & {
				consequent: AstNode;
				alternate: AstNode | null;
			};
			// `else` range starts at the keyword, right after the consequent in minified code
			if (alternate && hasOffsets(consequent)) {
				blockStarts.add(consequent.end);
			}
		}
		if (FUNCTION_TYPES.has(node.type) && hasOffsets(node)) {
			const { body } = node as AstNode & { body: AstNode };
			currentFunction =
				functions.push({
					startOffset: node.start,
					// V8 range of a static method starts after `static`, so we look into the body,
					// unless the body is another function, e.g. `(a) => (b) => a + b`
					countOffset:
						FUNCTION_TYPES.has(body.type) || !hasOffsets(body)
							? node.start
							: body.start,
					endOffset: node.end,
					parent: parentFunction,
				}) - 1;
		}
		for (const child of values(node).flat()) {
			if (isAstNode(child)) {
				visit(child, currentFunction);
			}
		}
	};
	visit(
		parse(code, {
			sourceType: "unambiguous",
			allowReturnOutsideFunction: true,
			errorRecovery: true,
		}).program,
	);
	for (const blockStart of blockStarts) {
		continuations.delete(blockStart);
	}
	return {
		continuations: [...continuations].toSorted(([a], [b]) => a - b),
		functions,
	};
};

// Sparse table for "max value in a range of indices" queries
const createRangeMax = (items: number[]) => {
	const levels = [items];
	for (let width = 2; width <= items.length; width *= 2) {
		// oxlint-disable-next-line typescript/no-non-null-assertion
		const previous = levels.at(-1)!;
		levels.push(
			previous
				.slice(0, items.length - width + 1)
				// oxlint-disable-next-line typescript/no-non-null-assertion
				.map((value, index) => Math.max(value, previous[index + width / 2]!)),
		);
	}
	return (from: number, to: number) => {
		const level = Math.floor(Math.log2(to - from + 1));
		// oxlint-disable-next-line typescript/no-non-null-assertion
		const levelValues = levels[level]!;
		return Math.max(
			// oxlint-disable-next-line typescript/no-non-null-assertion
			levelValues[from]!,
			// oxlint-disable-next-line typescript/no-non-null-assertion
			levelValues[to - 2 ** level + 1]!,
		);
	};
};

const firstIndexAtOrAfter = (sortedValues: number[], value: number) => {
	let low = 0;
	let high = sortedValues.length;
	while (low < high) {
		const middle = Math.floor((low + high) / 2);
		// oxlint-disable-next-line typescript/no-non-null-assertion
		if (sortedValues[middle]! < value) {
			low = middle + 1;
		} else {
			high = middle;
		}
	}
	return low;
};

export type RestoreRangeEnd = (
	startOffset: number,
	endOffset: number,
) => number;

// V8 reports code following a statement that may not complete normally
// (`return`, `throw`, `if`, loops, `await`, etc.) as a "continuation" range,
// but ends it where the next range starts, not where the enclosing block ends.
// So after e.g. a nested ternary the rest of the block reads its parent's count:
//
//   if (alwaysTrue) return;   // continuation count: 0
//   const x = a ? b : c;      // continuation range is cut at `? b`
//   unreachable();            // no range here -> function count, falsely covered
//
// A real block range never contains the end of a statement from a list that outlives the range,
// so a range which does (a continuation, possibly merged with a preceding range of the same count)
// is extended to the end of that list.
const createRangeEndRestorer = (
	continuations: [start: number, end: number][],
): RestoreRangeEnd => {
	const starts = continuations.map(([start]) => start);
	const getMaxEnd = createRangeMax(continuations.map(([, end]) => end));
	return (startOffset, endOffset) => {
		const fromIndex = firstIndexAtOrAfter(starts, startOffset);
		const toIndex = firstIndexAtOrAfter(starts, endOffset) - 1;
		return fromIndex > toIndex
			? endOffset
			: Math.max(endOffset, getMaxEnd(fromIndex, toIndex));
	};
};

export type GeneratedCode = {
	restoreRangeEnd: RestoreRangeEnd;
	// Functions containing an offset, innermost first.
	// Unlike V8 data, it includes functions V8 never compiled (e.g. nested in a function never called)
	findFunctions: (offset: number) => GeneratedFunction[];
};

export const analyzeGeneratedCode = (code: string): GeneratedCode => {
	try {
		const { continuations, functions } = collectAstDetails(code);
		const findInnermostFunction = createSegmentLookup(
			functions.map((fn, index) => ({ ...fn, index })),
			(fn) => fn.index,
		);
		return {
			restoreRangeEnd: createRangeEndRestorer(continuations),
			findFunctions: (offset) => {
				const result: GeneratedFunction[] = [];
				for (
					let fn = functions[findInnermostFunction(offset) ?? -1];
					fn;
					fn = functions[fn.parent ?? -1]
				) {
					result.push(fn);
				}
				return result;
			},
		};
	} catch (error) {
		baseLogger.warn(
			`Failed to parse generated code, coverage may be less precise: ${String(error)}`,
		);
		return {
			restoreRangeEnd: (_startOffset, endOffset) => endOffset,
			findFunctions: () => [],
		};
	}
};
