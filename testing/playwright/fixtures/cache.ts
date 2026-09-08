import { hashKey } from "@tanstack/react-query";
import type { Mutation, Query } from "@tanstack/react-query";
import type { AnyTRPCProcedure, AnyTRPCRouter } from "@trpc/server";
import type { RouterRecord } from "@trpc/server/unstable-core-do-not-import";
import assert from "node:assert";
import EventEmitter from "node:events";
import { capitalize, isNonNullish, keys } from "remeda";

import type {
	RawMutationKey,
	RawQueryKey,
	TRPCInput,
	TRPCKey,
	TRPCMutationInput,
	TRPCMutationKey,
	TRPCQueryInput,
	TRPCQueryKey,
} from "~app/trpc";
import { expectSubscribe } from "~tests/frontend/utils/expect";
import { router } from "~web/handlers";

import { apiFixtures as test } from "./api";

type AmountsWith<T> = Record<Mutation["state"]["status"], T>;
type RangeCacheAmount = { min: number; max: number };
export type ActualCacheAmounts = AmountsWith<number>;
type ExpectedCacheAmounts = AmountsWith<RangeCacheAmount>;
type CacheOptionsObject<T extends TRPCKey> =
	| number
	| (Partial<AmountsWith<number>> & {
			input?: T extends TRPCQueryKey
				? TRPCQueryInput<T>
				: T extends TRPCMutationKey
					? TRPCMutationInput<T>
					: never;
	  });

const queryTypes = {
	success: true,
	error: true,
	pending: true,
	idle: true,
} satisfies Record<Mutation["state"]["status"], true>;

const getAmountElement = (
	element?: number | Partial<RangeCacheAmount>,
): RangeCacheAmount => {
	if (!element) {
		return { min: 0, max: Infinity };
	}
	if (typeof element === "number") {
		return { min: element, max: element };
	}
	return {
		min: element.min ?? 0,
		max: element.max ?? Infinity,
	};
};

const formatExpectedRange = (expected: RangeCacheAmount) => {
	if (expected.min === expected.max) {
		return `${expected.max}`;
	}
	return `${expected.min}-${expected.max}`;
};

const getAmountErrors = ({
	actualAmounts,
	expectedAmounts,
}: {
	actualAmounts: ActualCacheAmounts;
	expectedAmounts: ExpectedCacheAmounts;
}) =>
	keys(queryTypes)
		.map((type) => {
			if (
				actualAmounts[type] >= expectedAmounts[type].min &&
				actualAmounts[type] <= expectedAmounts[type].max
			) {
				return null;
			}
			return `${capitalize(type)} entries: expected ${formatExpectedRange(
				expectedAmounts[type],
			)}, got ${actualAmounts[type]}`;
		})
		.filter(isNonNullish);

const getExpectedAmounts = <T extends TRPCKey>(
	optionsObject: CacheOptionsObject<T> = 1,
): ExpectedCacheAmounts => {
	if (typeof optionsObject === "number") {
		return {
			success: { min: optionsObject, max: optionsObject },
			error: { min: 0, max: Infinity },
			pending: { min: 0, max: 0 },
			idle: { min: 0, max: 0 },
		};
	}
	return {
		success: getAmountElement(optionsObject.success),
		error: getAmountElement(optionsObject.error),
		pending: getAmountElement(optionsObject.pending),
		idle: getAmountElement(optionsObject.idle),
	};
};

const DEFAULT_AWAIT_CACHE_TIMEOUT = 5000;

type CacheType = "query" | "mutation";

const getProcedure = (
	currentRouter: AnyTRPCRouter & RouterRecord,
	path: string,
): AnyTRPCProcedure => {
	const [first, ...rest] = path.split(".");
	assert.ok(first);
	if (rest.length === 0) {
		return currentRouter[first] as AnyTRPCProcedure;
	}
	return getProcedure(
		currentRouter[first] as AnyTRPCRouter & RouterRecord,
		rest.join("."),
	);
};

type CacheFixtures = {
	cache: {
		subscribe: <T extends TRPCKey>(options: {
			key: T;
			type: CacheType;
			listener: (values: ActualCacheAmounts) => void;
			input?: TRPCInput<T>;
		}) => Promise<() => Promise<void>>;
	};
	awaitCacheKey: <K extends TRPCKey>(
		key: K,
		options?: CacheOptionsObject<K>,
		timeout?: number,
	) => Promise<void>;
};

export const cacheFixtures = test.extend<CacheFixtures>({
	cache: [
		async ({ page }, use) => {
			// oxlint-disable-next-line unicorn/prefer-event-target
			const cacheEventEmitter = new EventEmitter<
				Record<TRPCKey, ActualCacheAmounts[]>
			>();
			// oxlint-disable-next-line no-unused-vars
			await using exposedFunction = await page.exposeFunction(
				"onCacheEvent",
				(key: TRPCKey, values: ActualCacheAmounts) =>
					cacheEventEmitter.emit(key, values),
			);
			// oxlint-disable-next-line no-unused-vars
			await using binding = await page.exposeBinding(
				"hashKey",
				// oxlint-disable-next-line typescript/no-unsafe-argument
				(_source, obj) => hashKey(obj),
			);
			await use({
				subscribe: async ({ key, type, listener, input }) => {
					let unsubscribeId = "unknown";
					// oxlint-disable-next-line typescript/no-unnecessary-type-assertion
					const typedKey = key as TRPCKey;

					cacheEventEmitter.on(typedKey, listener);
					unsubscribeId = await page.evaluate(
						([keyInner, typeInner, inputInner]) => {
							// oxlint-disable-next-line typescript/no-unnecessary-condition
							window.querySubscriptions ??= {};
							const { queryClient } = window;
							if (!queryClient) {
								throw new Error("window.queryClient is not defined yet");
							}
							const id = crypto.randomUUID();
							window.querySubscriptions[id] = [];
							const getAmounts = (values: (Query | Mutation)[]) =>
								// oxlint-disable-next-line no-restricted-properties
								Object.fromEntries(
									["success", "error", "pending", "idle"].map((status) => [
										status,
										values.filter((element) => element.state.status === status)
											.length,
									]),
								) as ActualCacheAmounts;
							switch (typeInner) {
								case "mutation": {
									const cache = queryClient.getMutationCache();
									const notifyCache = () =>
										window.onCacheEvent(
											keyInner,
											getAmounts(
												cache.findAll({ mutationKey: [keyInner.split(".")] }),
											),
										);
									window.querySubscriptions[id].push(
										cache.subscribe((cacheNotifyEvent) => {
											const rawMutationKey = cacheNotifyEvent.mutation?.options
												.mutationKey as RawMutationKey | undefined;
											if (!rawMutationKey) {
												return;
											}
											const mutationKey = rawMutationKey[0].join(
												".",
											) as TRPCMutationKey;
											if (
												mutationKey !== keyInner ||
												cacheNotifyEvent.type !== "updated"
											) {
												return;
											}
											notifyCache();
										}),
									);
									notifyCache();
									break;
								}
								case "query": {
									const cache = queryClient.getQueryCache();
									const notifyCache = () =>
										window.onCacheEvent(
											keyInner,
											getAmounts(
												cache.findAll({ queryKey: [keyInner.split(".")] }),
											),
										);
									window.querySubscriptions[id].push(
										cache.subscribe((cacheNotifyEvent) => {
											const rawQueryKey = cacheNotifyEvent.query
												.queryKey as RawQueryKey;
											const queryKey = rawQueryKey[0].join(".") as TRPCQueryKey;
											if (
												queryKey !== keyInner ||
												cacheNotifyEvent.type !== "updated" ||
												(inputInner &&
													window.hashKey([rawQueryKey[1]?.input]) !==
														window.hashKey([inputInner]))
											) {
												return;
											}
											notifyCache();
										}),
									);
									notifyCache();
									break;
								}
							}
							return id;
						},
						[key, type, input] as const,
					);
					return async () => {
						cacheEventEmitter.off(typedKey, listener);
						await page.evaluate(
							([unsubscribeIdInner]) => {
								const unsubscribers =
									window.querySubscriptions[unsubscribeIdInner] ?? [];
								for (const unsubscriber of unsubscribers) {
									unsubscriber();
								}
							},
							[unsubscribeId] as const,
						);
					};
				},
			});
		},
		{ auto: true },
	],

	awaitCacheKey: [
		async ({ cache }, use) => {
			await use(
				async (key, optionsObject, timeout = DEFAULT_AWAIT_CACHE_TIMEOUT) => {
					const procedure = getProcedure(
						router as unknown as AnyTRPCRouter & RouterRecord,
						key,
					);
					const procedureType =
						// oxlint-disable-next-line no-underscore-dangle
						procedure._def.type === "query" ? "query" : "mutation";

					const { expectedAmounts, input } = {
						input:
							typeof optionsObject === "number"
								? undefined
								: optionsObject?.input,
						expectedAmounts: getExpectedAmounts(optionsObject),
					};

					await expectSubscribe<ActualCacheAmounts>(
						async (onData) =>
							cache.subscribe({
								key,
								type: procedureType,
								listener: onData,
								input: input as TRPCInput<typeof key>,
							}),
						(actualAmounts) =>
							getAmountErrors({
								actualAmounts,
								expectedAmounts,
							}).length === 0,
						{
							timeout,
							message: (actualAmounts) =>
								[
									`${capitalize(procedureType)} await for "${key}" failed after ${timeout}ms`,
									...(actualAmounts
										? getAmountErrors({ actualAmounts, expectedAmounts })
										: ["No reading were taken from cache"]),
								].join("\n"),
						},
					);
				},
			);
		},
		{ box: true },
	],
});
