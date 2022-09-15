import React from "react";

import { UseQueryOptions } from "@tanstack/react-query";

import {
	trpc,
	TRPCError,
	TRPCQueryInput,
	TRPCQueryKey,
	TRPCQueryOutput,
	TRPCReactContext,
} from "app/trpc";

export type TRPCQueryOptions<Path extends TRPCQueryKey> = UseQueryOptions<
	TRPCQueryOutput<Path>,
	TRPCError,
	TRPCQueryOutput<Path>,
	[Path, TRPCQueryInput<Path>]
>;

export type WithContextIfExists<
	T,
	Context = undefined
> = undefined extends Context ? [T] : [T, Context];

export type UseContextedQueryOptions<
	Path extends TRPCQueryKey,
	Context = undefined
> = {
	onError?: (
		...args: WithContextIfExists<TRPCReactContext, Context>
	) => NonNullable<TRPCQueryOptions<Path>["onError"]>;
	onSuccess?: (
		...args: WithContextIfExists<TRPCReactContext, Context>
	) => NonNullable<TRPCQueryOptions<Path>["onSuccess"]>;
	onSettled?: (
		...args: WithContextIfExists<TRPCReactContext, Context>
	) => NonNullable<TRPCQueryOptions<Path>["onSettled"]>;
};

export const useTrpcQueryOptions = <
	Path extends TRPCQueryKey,
	Context = undefined
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
	} & TRPCQueryOptions<Path> = {}
): TRPCQueryOptions<Path> => {
	const trpcContext = trpc.useContext();
	return React.useMemo(() => {
		const trpcArgs = [trpcContext, context] as any;
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
