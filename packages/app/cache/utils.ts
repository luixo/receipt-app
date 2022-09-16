import React from "react";

import {
	TRPCQuery,
	TRPCQueryInput,
	TRPCQueryKey,
	TRPCQueryOutput,
	TRPCReactContext,
	UpdateArgs,
	InvalidateArgs,
} from "app/trpc";
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
			prev: TRPCQueryOutput<Key>
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
	key: Key
): GenericController<Key> => {
	const getQueries = () =>
		(
			trpc.queryClient.getQueriesData([key]) as [
				[Key, TRPCQueryInput<Key>],
				TRPCQueryOutput<Key>
			][]
		).map(([[, input], query]) => [input, query] as const);
	return {
		get: getQueries,
		invalidate: (fn, ...args) =>
			getQueries()
				.filter(([input, output]) => fn(input, output))
				.forEach(([input]) =>
					trpc.queryClient.invalidateQueries([key], {
						predicate: (query) =>
							input === (query as unknown as TRPCQuery<Key>).queryKey[1],
						...args,
					})
				),
		update: (fn, ...args) => {
			getQueries().forEach(([input, prevData]) => {
				if (!prevData) {
					return;
				}
				trpc.queryClient.setQueryData(
					input === undefined ? [key] : [key, input],
					fn(input, prevData),
					...args
				);
			});
		},
		upsert: (input, data, ...args) =>
			trpc.queryClient.setQueryData([key, input], data, ...args),
	};
};

type RevertFn = () => void;

export type UpdateFn<Value, ReturnValue = Value> = (
	value: Value
) => ReturnValue;

export type SnapshotFn<Value, ReturnValue = Value> = (
	snapshot: Value
) => UpdateFn<Value, ReturnValue>;

export type UpdateRevertOption<
	GetController extends {
		getRevertController: (trpc: TRPCReactContext) => unknown;
	}
> = (
	controller: ReturnType<GetController["getRevertController"]>
) => RevertFn | undefined;

export type UpdateOption<
	GetController extends { getController: (trpc: TRPCReactContext) => unknown }
> = (controller: ReturnType<GetController["getController"]>) => void;

export const createRef = <T>(
	...args: undefined extends T ? [] : [T]
): React.MutableRefObject<T> => ({ current: args[0]! });

export const withRef = <T>(
	fn: (ref: React.MutableRefObject<T>) => void,
	...args: undefined extends T ? [] : [T]
) => {
	const ref = createRef<T>(...args);
	fn(ref);
	return ref.current;
};

export const applyWithRevert = <Value>(
	applyFn: () => Value | undefined,
	revertFn: (snapshot: Value) => void
): RevertFn | undefined => {
	const appliedReturn = applyFn();
	if (appliedReturn !== undefined) {
		return () => revertFn(appliedReturn);
	}
};

export const applyUpdateFnWithRevert = <Value>(
	fn: (updater: UpdateFn<Value>) => Value | undefined,
	updateFn: UpdateFn<Value>,
	revertFn: ((snapshot: Value) => UpdateFn<Value>) | undefined
): RevertFn | undefined => {
	const modifiedValue = fn(updateFn);
	if (modifiedValue !== undefined && revertFn) {
		return () => {
			fn(revertFn(modifiedValue));
		};
	}
};

export const getUpdaters = <
	T extends Record<
		string,
		{
			getRevertController: (trpc: TRPCReactContext) => unknown;
			getController: (trpc: TRPCReactContext) => unknown;
		}
	>
>(
	input: T
) => {
	const updateRevert = (
		trpc: TRPCReactContext,
		options: {
			[K in keyof T]: UpdateRevertOption<T[K]>;
		}
	) =>
		Object.entries(input)
			.map(([key, { getRevertController }]) =>
				options[key]!(
					getRevertController(trpc) as Parameters<typeof options[keyof T]>[0]
				)
			)
			.filter(nonNullishGuard);

	const update = (
		trpc: TRPCReactContext,
		options: {
			[K in keyof T]: UpdateOption<T[K]>;
		}
	) => {
		Object.entries(input).forEach(([key, { getController }]) => {
			options[key]!(
				getController(trpc) as Parameters<typeof options[keyof T]>[0]
			);
		});
	};

	return { updateRevert, update };
};
