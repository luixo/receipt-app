import React from "react";

import type { UseQueryOptions } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";

import type { ControllerContext } from "app/cache/utils";
import type {
	TRPCError,
	TRPCQueryInput,
	TRPCQueryKey,
	TRPCQueryOutput,
} from "app/trpc";
import { trpc } from "app/trpc";
import type { MaybeAddElementToArray } from "app/utils/types";

export type TRPCQueryOptions<Path extends TRPCQueryKey> = UseQueryOptions<
	TRPCQueryOutput<Path>,
	TRPCError,
	TRPCQueryOutput<Path>,
	[Path, TRPCQueryInput<Path>]
>;

type Contexts<Context = undefined> = MaybeAddElementToArray<
	[ControllerContext],
	Context
>;

export type UseContextedQueryOptions<
	Path extends TRPCQueryKey,
	Context = undefined,
> = {
	onError?: (
		...args: Contexts<Context>
	) => NonNullable<TRPCQueryOptions<Path>["onError"]>;
	onSuccess?: (
		...args: Contexts<Context>
	) => NonNullable<TRPCQueryOptions<Path>["onSuccess"]>;
	onSettled?: (
		...args: Contexts<Context>
	) => NonNullable<TRPCQueryOptions<Path>["onSettled"]>;
};

export const useTrpcQueryOptions = <
	Path extends TRPCQueryKey,
	Context = undefined,
>(
	{
		onError: onErrorTrpc,
		onSettled: onSettledTrpc,
		onSuccess: onSuccessTrpc,
	}: UseContextedQueryOptions<Path, Context>,
	{
		context,
		onError,
		onSettled,
		onSuccess,
		...rest
	}: {
		context?: Context;
	} & TRPCQueryOptions<Path> = {},
): TRPCQueryOptions<Path> => {
	const trpcContext = trpc.useContext();
	const queryClient = useQueryClient();
	return React.useMemo(() => {
		const controllerContext = { queryClient, trpcContext };
		const trpcArgs = [controllerContext, context] as Contexts<Context>;
		return {
			onError: (...args) => {
				onError?.(...args);
				return onErrorTrpc?.(...trpcArgs)(...args);
			},
			onSettled: (...args) => {
				onSettled?.(...args);
				return onSettledTrpc?.(...trpcArgs)(...args);
			},
			onSuccess: (...args) => {
				onSuccess?.(...args);
				return onSuccessTrpc?.(...trpcArgs)(...args);
			},
			...rest,
		};
	}, [
		trpcContext,
		queryClient,
		context,
		onError,
		onSettled,
		onSuccess,
		onErrorTrpc,
		onSettledTrpc,
		onSuccessTrpc,
		rest,
	]);
};
