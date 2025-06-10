import type { QueryClient } from "@tanstack/react-query";

import type { useTRPC } from "~app/utils/trpc";

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

export type ControllerWith<T> = {
	queryClient: QueryClient;
} & T;

export type ControllerContext = ControllerWith<{
	trpc: ReturnType<typeof useTRPC>;
}>;
