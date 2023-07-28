import React from "react";

import {
	TRPCQueryInput,
	TRPCQueryKey,
	TRPCQueryOutput,
	TRPCReactContext,
	UpdateArgs,
	InvalidateArgs,
} from "app/trpc";
import { SplitStringByComma } from "app/utils/types";
import { nonNullishGuard } from "app/utils/utils";

export type GenericController<Key extends TRPCQueryKey> = {
	get: () => (readonly [TRPCQueryInput<Key>, TRPCQueryOutput<Key>])[];
	invalidate: (
		fn: (
			input: TRPCQueryInput<Key>,
			prev: TRPCQueryOutput<Key>,
			...args: InvalidateArgs
		) => boolean,
		...args: Omit<InvalidateArgs, "predicate">
	) => void;
	update: (
		fn: (
			input: TRPCQueryInput<Key>,
			prev: TRPCQueryOutput<Key>,
		) => TRPCQueryOutput<Key> | undefined,
		...args: UpdateArgs
	) => void;
	upsert: (
		input: TRPCQueryInput<Key>,
		data: TRPCQueryOutput<Key>,
		...args: UpdateArgs
	) => void;
};

export const createController = <Key extends TRPCQueryKey>(
	trpc: TRPCReactContext,
	key: Key,
): GenericController<Key> => {
	const splitKey = key.split(".") as SplitStringByComma<Key>;
	const getQueries = () =>
		(
			trpc.queryClient.getQueriesData([splitKey]) as [
				[
					SplitStringByComma<Key>,
					TRPCQueryInput<Key> extends undefined
						? undefined
						: { input: TRPCQueryInput<Key>; type: "infinite" | "query" },
				],
				TRPCQueryOutput<Key>,
			][]
		).map(([[, inputWrapper], data]) => [inputWrapper, data] as const);
	return {
		get: () =>
			getQueries().map(
				([inputWrapper, data]) => [inputWrapper?.input, data] as const,
			),
		invalidate: (fn, ...args) =>
			getQueries()
				.filter(([inputWrapper, output]) => fn(inputWrapper?.input, output))
				.forEach(([inputWrapper]) =>
					trpc.queryClient.invalidateQueries([splitKey, inputWrapper], {
						exact: true,
						...args,
					}),
				),
		update: (fn, ...args) => {
			getQueries().forEach(([inputWrapper, prevData]) => {
				if (!prevData) {
					return;
				}
				trpc.queryClient.setQueryData(
					inputWrapper?.input === undefined
						? [splitKey]
						: [splitKey, inputWrapper],
					fn(inputWrapper?.input, prevData),
					...args,
				);
			});
		},
		upsert: (input, data, ...args) =>
			trpc.queryClient.setQueryData(
				input === undefined ? [splitKey] : [splitKey, { input, type: "query" }],
				data,
				...args,
			),
	};
};

type EmptyFn = () => void;

export type UpdateFn<Value, ReturnValue = Value> = (
	value: Value,
) => ReturnValue;

export type SnapshotFn<Value, ReturnValue = Value> = (
	snapshot: Value,
) => UpdateFn<Value, ReturnValue>;

export type UpdaterRevertResult = {
	revertFn?: EmptyFn;
	finalizeFn?: EmptyFn;
};

export type UpdateRevertOption<
	GetController extends {
		getRevertController: (trpc: TRPCReactContext) => unknown;
	},
> = (
	controller: ReturnType<GetController["getRevertController"]>,
) => UpdaterRevertResult | undefined;

export type UpdateOption<
	GetController extends { getController: (trpc: TRPCReactContext) => unknown },
> = (controller: ReturnType<GetController["getController"]>) => void;

export const createRef = <T>(
	...args: undefined extends T ? [] : [T]
): React.MutableRefObject<T> => ({ current: args[0]! });

export const withRef = <T, R = void>(
	fn: (ref: React.MutableRefObject<T>) => R,
	...args: undefined extends T ? [] : [T]
) => {
	const ref = createRef<T>(...args);
	const returnValue = fn(ref);
	return {
		current: ref.current,
		returnValue,
	};
};

export const applyWithRevert = <Value>(
	applyFn: () => Value | undefined,
	revertFn: (snapshot: Value) => void,
	finalizeFn?: (snapshot: Value) => void,
): UpdaterRevertResult | undefined => {
	const appliedReturn = applyFn();
	if (appliedReturn !== undefined) {
		return {
			revertFn: () => revertFn(appliedReturn),
			finalizeFn: () => finalizeFn?.(appliedReturn),
		};
	}
};

export const applyUpdateFnWithRevert = <Value, ResultValue = Value>(
	fn: (updater: UpdateFn<Value>) => ResultValue | undefined,
	updateFn: UpdateFn<Value>,
	revertFn: ((snapshot: ResultValue) => UpdateFn<Value>) | undefined,
	finalizeFn?: (snapshot: ResultValue) => void,
): UpdaterRevertResult | undefined => {
	const modifiedValue = fn(updateFn);
	if (modifiedValue !== undefined) {
		return {
			revertFn: () => {
				if (!revertFn) {
					return;
				}
				fn(revertFn(modifiedValue));
			},
			finalizeFn: () => {
				if (!finalizeFn) {
					return;
				}
				finalizeFn(modifiedValue);
			},
		};
	}
};

export const mergeUpdaterResults = (
	...results: (UpdaterRevertResult | undefined)[]
): UpdaterRevertResult => {
	const filteredResults = results.filter(nonNullishGuard);
	return {
		revertFn: () => {
			filteredResults
				.map(({ revertFn }) => revertFn)
				.filter(nonNullishGuard)
				.forEach((fn) => fn());
		},
		finalizeFn: () => {
			filteredResults
				.map(({ finalizeFn }) => finalizeFn)
				.filter(nonNullishGuard)
				.forEach((fn) => fn());
		},
	};
};

export const getUpdaters = <
	T extends Record<
		string,
		{
			getRevertController: (trpc: TRPCReactContext) => unknown;
			getController: (trpc: TRPCReactContext) => unknown;
		}
	>,
>(
	input: T,
) => {
	const updateRevert = (
		trpc: TRPCReactContext,
		options: {
			[K in keyof T]: UpdateRevertOption<T[K]>;
		},
	) =>
		mergeUpdaterResults(
			...Object.entries(input).map(([key, { getRevertController }]) =>
				options[key]!(
					getRevertController(trpc) as Parameters<(typeof options)[keyof T]>[0],
				),
			),
		);

	const update = (
		trpc: TRPCReactContext,
		options: {
			[K in keyof T]: UpdateOption<T[K]>;
		},
	) => {
		Object.entries(input).forEach(([key, { getController }]) => {
			options[key]!(
				getController(trpc) as Parameters<(typeof options)[keyof T]>[0],
			);
		});
	};

	return { updateRevert, update };
};
