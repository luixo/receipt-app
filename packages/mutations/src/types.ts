import type { QueryClient } from "@tanstack/react-query";

import type { useTRPC } from "~app/utils/trpc";

type EmptyFn = () => void;

type Args<Value, Context = undefined> = Context extends undefined
	? [Value]
	: [Value, Context];

export type UpdateFn<Value, ReturnValue = Value, Context = undefined> = (
	...args: Args<Value, Context>
) => ReturnValue;

export type SnapshotFn<Value, ReturnValue = Value, Context = undefined> = (
	...args: Args<Value, Context>
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
