import type { QueryClient } from "@tanstack/react-query";

import type { TRPCReact, TRPCReactUtils } from "~app/trpc";

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

export type ControllerContext = {
	trpcUtils: TRPCReactUtils;
	queryClient: QueryClient;
	trpc: TRPCReact;
};
