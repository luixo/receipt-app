import { hashKey } from "@tanstack/react-query";
import { TRPCError } from "@trpc/server";
import { omit, unique, values } from "remeda";

export const getDuplicates = <T, K extends string | string[]>(
	array: readonly T[],
	getKey: (item: T) => K,
) => {
	const items = array.map(getKey);
	const map = new Map<string, { count: number; value: K }>();
	for (const item of items) {
		const key = Array.isArray(item) ? item.join("|") : String(item);
		const prevMapElement = map.get(key) || {
			count: 0,
			value: item,
		};
		map.set(key, {
			count: prevMapElement.count + 1,
			value: prevMapElement.value,
		});
	}
	return [...map.values()]
		.filter(({ count }) => count !== 1)
		.map(({ value, count }) => [value, count] as const);
};

export type GeneralInput = { cursor: number; limit: number };
export type GeneralOutput<T> = { cursor: number; items: T[] };

const mergeInputs = <I extends GeneralInput>(inputs: I[]): Map<I, I> => {
	const sorted = [...inputs].toSorted((a, b) => a.cursor - b.cursor);

	const groups = sorted.reduce<(I & { members: I[] })[]>((acc, element) => {
		const lastGroup = acc.at(-1);
		if (!lastGroup || element.cursor > lastGroup.cursor + lastGroup.limit) {
			return [...acc, { ...element, members: [element] }];
		}
		return [
			...acc.slice(0, -1),
			{
				...lastGroup,
				limit:
					Math.max(
						lastGroup.cursor + lastGroup.limit,
						element.cursor + element.limit,
					) - lastGroup.cursor,
				members: [...lastGroup.members, element],
			},
		];
	}, []);

	return new Map<I, I>(
		groups.flatMap(({ members, ...group }) =>
			members.map((member) => [member, group as unknown as I]),
		),
	);
};

export const queueList = async <
	I extends GeneralInput,
	R,
	O extends GeneralOutput<R>,
>(
	inputs: readonly I[],
	fetchPage: (inputs: I) => Promise<O>,
): Promise<(O | TRPCError)[]> => {
	const mappedInputs = inputs.reduce<Record<string, I[]>>((acc, input) => {
		const key = hashKey([omit(input, ["cursor", "limit"])]);
		acc[key] = acc[key] || [];
		acc[key].push(input);
		return acc;
	}, {});
	const compactInputsMap = new Map<I, I>(
		values(mappedInputs).flatMap((mappedInput) => {
			const compactInput = mergeInputs(mappedInput);
			return mappedInput.map(
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				(input) => [input, compactInput.get(input)!],
			);
		}),
	);
	const compactInputs = unique([...compactInputsMap.values()]);
	const list = await Promise.all(
		compactInputs.map(async (input) =>
			fetchPage(input).catch(
				(e) =>
					/* c8 ignore start */
					e instanceof TRPCError
						? e
						: new TRPCError({
								code: "INTERNAL_SERVER_ERROR",
								message: `Unknown internal error: ${String(e)}`,
								cause: e,
							}),
				/* c8 ignore stop */
			),
		),
	);
	const mappedList = new Map<I, O | TRPCError>(
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		compactInputs.map((input, index) => [input, list[index]!]),
	);
	return inputs.map((input) => {
		const mappedInput = compactInputsMap.get(input);
		/* c8 ignore start */
		if (!mappedInput) {
			return new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Expected for input "${JSON.stringify(input)}" to have corresponding compact input.`,
			});
		}
		/* c8 ignore stop */
		const output = mappedList.get(mappedInput);
		if (output instanceof TRPCError) {
			return output;
		}
		/* c8 ignore start */
		if (!output) {
			return new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Expected for compact input "${JSON.stringify(mappedInput)}" to have corresponding output.`,
			});
		}
		/* c8 ignore stop */
		const startIndex = input.cursor - output.cursor;
		return {
			...output,
			cursor: input.cursor,
			items: output.items.slice(startIndex, startIndex + input.limit),
		};
	});
};
