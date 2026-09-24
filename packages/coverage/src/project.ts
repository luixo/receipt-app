import type { FileCoverageData } from "istanbul-lib-coverage";
import { fromEntries, mapValues } from "remeda";

import type { GeneratedCode } from "./generated-code";
import type { CountAt } from "./ranges";
import type { ArmProbe, FileSkeleton } from "./skeleton";
import type { MappedPosition, Position, ScriptIndex, Span } from "./source-map";
import { comparePositions, isSpanInside, isWithin } from "./source-map";

// Generated offsets to read V8 counts at, resolved once per script
// (the same code may be emitted more than once, e.g. by a minifier).
// `undefined` means the code is not in the script, hence never executed there.
type Probe = number[] | undefined;

type ArmPlan = { probe: Probe } | { whole: Probe; minus: Probe };

export type FilePlan = {
	skeleton: FileSkeleton;
	statements: [id: string, probe: Probe][];
	functions: [id: string, probe: Probe][];
	branches: [id: string, arms: ArmPlan[]][];
};

const firstIndexAtOrAfter = (
	positions: MappedPosition[],
	position: Position,
) => {
	let low = 0;
	let high = positions.length;
	while (low < high) {
		const middle = Math.floor((low + high) / 2);
		// oxlint-disable-next-line typescript/no-non-null-assertion
		if (comparePositions(positions[middle]!, position) < 0) {
			low = middle + 1;
		} else {
			high = middle;
		}
	}
	return low;
};

// Offsets of every generated occurrence of the original position at `index`
const offsetsAt = (positions: MappedPosition[], index: number) => {
	const offsets: number[] = [];
	// oxlint-disable-next-line typescript/no-non-null-assertion
	const target = positions[index]!;
	for (
		let current = index;
		positions[current] &&
		// oxlint-disable-next-line typescript/no-non-null-assertion
		comparePositions(positions[current]!, target) === 0;
		current += 1
	) {
		// oxlint-disable-next-line typescript/no-non-null-assertion
		offsets.push(positions[current]!.offset);
	}
	return offsets;
};

type ScriptHelpers = Pick<ScriptIndex, "findForeignOffsetBefore"> &
	Pick<GeneratedCode, "findFunctions">;

const createProbeResolver = (
	repoPath: string,
	positions: MappedPosition[],
	functionSpans: Span[],
	{ findForeignOffsetBefore, findFunctions }: ScriptHelpers,
) => {
	// First mapped position in the span, optionally ignoring given nested spans
	const findFirstIndex = (span: Span, ignoredSpans: Span[] = []) => {
		for (
			let index = firstIndexAtOrAfter(positions, span.start);
			index < positions.length;
			index += 1
		) {
			// oxlint-disable-next-line typescript/no-non-null-assertion
			const position = positions[index]!;
			if (!isWithin(position, span)) {
				return undefined;
			}
			if (!ignoredSpans.some((ignored) => isWithin(position, ignored))) {
				return index;
			}
		}
		return undefined;
	};

	// Generated function for an original function, found from a position inside it.
	// Bundlers keep nesting of functions, so if the function is k-th innermost function
	// around the position in the original code, it is k-th innermost function in generated code.
	// Unless the function was inlined into another function by a bundler:
	// then code from outside of the function is emitted between the two.
	const findGeneratedFunction = (index: number, offset: number, fn: Span) => {
		// oxlint-disable-next-line typescript/no-non-null-assertion
		const position = positions[index]!;
		const depth = functionSpans
			.filter((functionSpan) => isWithin(position, functionSpan))
			.toSorted((a, b) => comparePositions(b.start, a.start))
			.indexOf(fn);
		const generatedFunction = findFunctions(offset)[depth];
		if (
			!generatedFunction ||
			generatedFunction.startOffset <=
				findForeignOffsetBefore(offset, repoPath, fn)
		) {
			return undefined;
		}
		return generatedFunction;
	};

	// Generated function for an original function, from any of its mapped positions
	// (the first ones may belong to code a compiler emitted around the function)
	const findGeneratedFunctionInSpan = (fn: Span) => {
		for (
			let index = firstIndexAtOrAfter(positions, fn.start);
			index < positions.length;
			index += 1
		) {
			// oxlint-disable-next-line typescript/no-non-null-assertion
			if (!isWithin(positions[index]!, fn)) {
				return undefined;
			}
			for (const offset of offsetsAt(positions, index)) {
				const generatedFunction = findGeneratedFunction(index, offset, fn);
				if (generatedFunction) {
					return generatedFunction;
				}
			}
		}
		return undefined;
	};

	// Whether the generated offset runs as a part of the function the position belongs to.
	// Bundlers and compilers may emit code at other places, e.g. React Compiler assigns memoized
	// callbacks and checks their dependencies in the component, mapping it to the callback's code
	const isOwnOffset = (index: number, offset: number) => {
		// oxlint-disable-next-line typescript/no-non-null-assertion
		const position = positions[index]!;
		const [ownFunction] = functionSpans
			.filter((functionSpan) => isWithin(position, functionSpan))
			.toSorted((a, b) => comparePositions(b.start, a.start));
		return (
			!ownFunction ||
			findGeneratedFunction(index, offset, ownFunction) !== undefined
		);
	};

	// Offsets of the first code in the span that runs as a part of its own function,
	// ignoring nested functions (they run on their own schedule)
	const findOwnOffsets = (span: Span, nestedFunctions: Span[]) => {
		const firstIndex = findFirstIndex(span, nestedFunctions);
		if (firstIndex === undefined) {
			return undefined;
		}
		for (
			let index: number | undefined = firstIndex;
			index !== undefined;
			index = findFirstIndex(
				{
					// oxlint-disable-next-line typescript/no-non-null-assertion
					start: { ...positions[index]!, column: positions[index]!.column + 1 },
					end: span.end,
				},
				nestedFunctions,
			)
		) {
			const currentIndex = index;
			const ownOffsets = offsetsAt(positions, currentIndex).filter((offset) =>
				isOwnOffset(currentIndex, offset),
			);
			if (ownOffsets.length !== 0) {
				return ownOffsets;
			}
		}
		// The function was inlined by a bundler, its code runs where it was inlined to
		return offsetsAt(positions, firstIndex);
	};

	return {
		// Count of the code in the span
		resolveSpan: (span: Span): Probe => {
			const nestedFunctions = functionSpans.filter((functionSpan) =>
				isSpanInside(functionSpan, span),
			);
			const ownOffsets = findOwnOffsets(span, nestedFunctions);
			if (ownOffsets) {
				return ownOffsets;
			}
			const firstIndex = findFirstIndex(span);
			if (firstIndex === undefined) {
				return undefined;
			}
			// The span is a nested function (e.g. `const fn = () => {}`),
			// we need the count of the code declaring it, not of its calls
			// oxlint-disable-next-line typescript/no-non-null-assertion
			const firstPosition = positions[firstIndex]!;
			const [nestedFunction] = nestedFunctions
				.filter((nested) => isWithin(firstPosition, nested))
				.toSorted((a, b) => comparePositions(a.start, b.start));
			const generatedFunction =
				nestedFunction && findGeneratedFunctionInSpan(nestedFunction);
			return generatedFunction
				? [generatedFunction.startOffset - 1]
				: offsetsAt(positions, firstIndex);
		},
		// Count of calls of the function
		resolveFunction: (body: Span, node: Span | undefined): Probe => {
			// V8 range of the generated function holds its call count
			const generatedFunction = node && findGeneratedFunctionInSpan(node);
			if (generatedFunction) {
				return [generatedFunction.countOffset];
			}
			// The function was inlined by a bundler, its body runs where it was inlined to
			return findOwnOffsets(
				body,
				functionSpans.filter((functionSpan) =>
					isSpanInside(functionSpan, body),
				),
			);
		},
	};
};

export const planFile = (
	skeleton: FileSkeleton,
	positions: MappedPosition[],
	scriptHelpers: ScriptHelpers,
): FilePlan => {
	const { resolveSpan, resolveFunction } = createProbeResolver(
		skeleton.coverage.path,
		positions,
		skeleton.functionSpans,
		scriptHelpers,
	);
	// Bundlers remove or inline statements that have no side effects, e.g. single-use constants:
	// `const values = {}; useForm({ values })` becomes `useForm({ values: {} })`.
	// Such a statement ran whenever the next statement that still exists did,
	// nothing observable could happen in between. If none exists (e.g. dead code), it never ran.
	const resolveRemovedStatement = (followingSpans: Span[]) => {
		for (const followingSpan of followingSpans) {
			const probe = resolveSpan(followingSpan);
			if (probe) {
				return probe;
			}
		}
		return undefined;
	};
	const planArm = (arm: ArmProbe): ArmPlan =>
		"span" in arm
			? { probe: resolveSpan(arm.span) }
			: { whole: resolveSpan(arm.whole), minus: resolveSpan(arm.minus) };
	return {
		skeleton,
		statements: skeleton.statements.map(([id, span, followingSpans]) => [
			id,
			resolveSpan(span) ?? resolveRemovedStatement(followingSpans),
		]),
		functions: skeleton.functions.map(([id, { body, node }]) => [
			id,
			resolveFunction(body, node),
		]),
		branches: skeleton.branches.map(([id, arms]) => [id, arms.map(planArm)]),
	};
};

const countProbe = (probe: Probe, countAt: CountAt) =>
	probe ? Math.max(...probe.map(countAt)) : 0;

const countArm = (arm: ArmPlan, countAt: CountAt) =>
	"probe" in arm
		? countProbe(arm.probe, countAt)
		: Math.max(
				0,
				countProbe(arm.whole, countAt) - countProbe(arm.minus, countAt),
			);

export type Counts = Pick<FileCoverageData, "s" | "f" | "b">;

// Counts of one V8 coverage dump of a script for a file
export const countFile = (plan: FilePlan, countAt: CountAt): Counts => ({
	s: fromEntries(
		plan.statements.map(([id, probe]) => [id, countProbe(probe, countAt)]),
	),
	f: fromEntries(
		plan.functions.map(([id, probe]) => [id, countProbe(probe, countAt)]),
	),
	b: fromEntries(
		plan.branches.map(([id, arms]) => [
			id,
			arms.map((arm) => countArm(arm, countAt)),
		]),
	),
});

export const sumCounts = (a: Counts, b: Counts): Counts => ({
	s: mapValues(a.s, (count, id) => count + (b.s[id] ?? 0)),
	f: mapValues(a.f, (count, id) => count + (b.f[id] ?? 0)),
	b: mapValues(a.b, (counts, id) =>
		counts.map((count, index) => count + (b.b[id]?.[index] ?? 0)),
	),
});
