import type { TraceMap } from "@jridgewell/trace-mapping";
import { eachMapping, sourceContentFor } from "@jridgewell/trace-mapping";

import { toRepoPath } from "./paths";

// Babel & istanbul convention: 1-based line, 0-based column
export type Position = { line: number; column: number };

export type Span = { start: Position; end: Position };

// An original position and the generated offset it was emitted at
export type MappedPosition = Position & { offset: number };

export const comparePositions = (a: Position, b: Position) =>
	a.line - b.line || a.column - b.column;

export const isSpanInside = (inner: Span, outer: Span) =>
	comparePositions(inner.start, outer.start) >= 0 &&
	comparePositions(inner.end, outer.end) <= 0;

export const isWithin = (position: Position, span: Span) =>
	comparePositions(position, span.start) >= 0 &&
	comparePositions(position, span.end) < 0;

const getLineOffsets = (code: string) => {
	const offsets = [0];
	for (let index = code.indexOf("\n"); index !== -1;) {
		offsets.push(index + 1);
		index = code.indexOf("\n", index + 1);
	}
	return offsets;
};

type GeneratedMapping = MappedPosition & { repoPath: string | undefined };

// Amount of mappings (sorted by offset) before an offset
const countBefore = (mappings: GeneratedMapping[], offset: number) => {
	let low = 0;
	let high = mappings.length;
	while (low < high) {
		const middle = Math.floor((low + high) / 2);
		// oxlint-disable-next-line typescript/no-non-null-assertion
		if (mappings[middle]!.offset < offset) {
			low = middle + 1;
		} else {
			high = middle;
		}
	}
	return low;
};

// Reverses a generated script's source map: for every covered original file,
// all original positions (sorted) with the generated offsets they were emitted at.
export const indexScript = (code: string, map: TraceMap) => {
	const lineOffsets = getLineOffsets(code);
	const repoPaths = new Map<string, string | undefined>();
	// In generated order, as `eachMapping` iterates
	const mappings: GeneratedMapping[] = [];
	eachMapping(map, (mapping) => {
		const lineOffset = lineOffsets[mapping.generatedLine - 1];
		if (mapping.source === null || lineOffset === undefined) {
			return;
		}
		if (!repoPaths.has(mapping.source)) {
			repoPaths.set(mapping.source, toRepoPath(mapping.source));
		}
		mappings.push({
			repoPath: repoPaths.get(mapping.source),
			line: mapping.originalLine,
			column: mapping.originalColumn,
			offset: lineOffset + mapping.generatedColumn,
		});
	});

	// Several sources may be the same file, e.g. `file.ts` and `file.ts?tsr-split=component`
	const sourcesByFile = new Map<string, string[]>();
	for (const [source, repoPath] of repoPaths) {
		if (repoPath) {
			sourcesByFile.set(repoPath, [
				...(sourcesByFile.get(repoPath) ?? []),
				source,
			]);
		}
	}

	const positionsByFile = new Map<string, MappedPosition[]>();
	for (const { repoPath, ...position } of mappings) {
		if (!repoPath) {
			continue;
		}
		const positions = positionsByFile.get(repoPath);
		if (positions) {
			positions.push(position);
		} else {
			positionsByFile.set(repoPath, [position]);
		}
	}
	for (const positions of positionsByFile.values()) {
		positions.sort((a, b) => comparePositions(a, b) || a.offset - b.offset);
	}

	return {
		positionsByFile,
		// Source texts the source map was generated for, if it includes them
		getSourceContents: (repoPath: string) =>
			(sourcesByFile.get(repoPath) ?? [])
				.map((source) => sourceContentFor(map, source))
				.filter((content) => content !== null),
		// Generated offset of the closest code before `offset` which doesn't originate from the span
		findForeignOffsetBefore: (offset: number, repoPath: string, span: Span) => {
			for (
				let index = countBefore(mappings, offset) - 1;
				index >= 0;
				index -= 1
			) {
				// oxlint-disable-next-line typescript/no-non-null-assertion
				const mapping = mappings[index]!;
				if (mapping.repoPath !== repoPath || !isWithin(mapping, span)) {
					return mapping.offset;
				}
			}
			return -1;
		},
	};
};

export type ScriptIndex = ReturnType<typeof indexScript>;
