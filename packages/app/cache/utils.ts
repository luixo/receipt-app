import type React from "react";

import type { QueryClient, QueryKey } from "@tanstack/react-query";

import type {
	TRPCQueryInput,
	TRPCQueryKey,
	TRPCQueryOutput,
	TRPCReactContext,
	TRPCSplitQueryKey,
} from "app/trpc";
import { nonNullishGuard } from "app/utils/utils";

type QueryClientData<Key extends TRPCQueryKey> = [
	[
		TRPCSplitQueryKey<Key>,
		TRPCQueryInput<Key> extends undefined
			? undefined
			: { input: TRPCQueryInput<Key>; type: "infinite" | "query" },
	],
	TRPCQueryOutput<Key>,
];

export const getAllInputs = <Key extends TRPCQueryKey>(
	queryClient: QueryClient,
	queryKey: QueryKey,
) =>
	(queryClient.getQueriesData(queryKey) as QueryClientData<Key>[]).map(
		(query) => query[0][1]?.input,
	) as TRPCQueryInput<Key>[];

type EmptyFn = () => void;

export type UpdateFn<Value, ReturnValue = Value> = (
	value: Value,
) => ReturnValue;

export type SnapshotFn<Value, ReturnValue = Value> = (
	snapshot: Value,
) => UpdateFn<Value, ReturnValue>;

type UpdaterRevertResult = {
	revertFn?: EmptyFn;
	finalizeFn?: EmptyFn;
};

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

export type ControllerContext = {
	trpcContext: TRPCReactContext;
	queryClient: QueryClient;
};

type UpdateRevertOption<
	GetController extends {
		getRevertController: (controllerContext: ControllerContext) => unknown;
	},
> = (
	controller: ReturnType<GetController["getRevertController"]>,
) => UpdaterRevertResult | undefined;

type UpdateOption<
	GetController extends {
		getController: (controllerContext: ControllerContext) => unknown;
	},
> = (controller: ReturnType<GetController["getController"]>) => void;

export const getUpdaters = <
	T extends Record<
		string,
		{
			getRevertController: (controllerContext: ControllerContext) => unknown;
			getController: (controllerContext: ControllerContext) => unknown;
		}
	>,
>(
	input: T,
) => {
	const updateRevert = (
		controllerContext: ControllerContext,
		options: {
			[K in keyof T]: UpdateRevertOption<T[K]> | undefined;
		},
	) =>
		mergeUpdaterResults(
			...Object.entries(input).map(([key, { getRevertController }]) => {
				const updater = options[key];
				if (!updater) {
					return;
				}
				return updater(
					getRevertController(controllerContext) as Parameters<
						typeof updater
					>[0],
				);
			}),
		);

	const update = (
		controllerContext: ControllerContext,
		options: {
			[K in keyof T]: UpdateOption<T[K]> | undefined;
		},
	) => {
		Object.entries(input).forEach(([key, { getController }]) => {
			const updater = options[key];
			if (!updater) {
				return;
			}
			return updater(
				getController(controllerContext) as Parameters<typeof updater>[0],
			);
		});
	};

	return { updateRevert, update };
};
