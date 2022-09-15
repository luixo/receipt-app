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
	) => TRPCQueryOptions<Path>["onError"];
	onSuccess?: (
		...args: WithContextIfExists<TRPCReactContext, Context>
	) => TRPCQueryOptions<Path>["onSuccess"];
	onSettled?: (
		...args: WithContextIfExists<TRPCReactContext, Context>
	) => TRPCQueryOptions<Path>["onSettled"];
};

export const useTrpcQueryOptions = <
	Path extends TRPCQueryKey,
	Context = undefined
>(
	...[{ onError, onSettled, onSuccess }, context]: WithContextIfExists<
		UseContextedQueryOptions<Path, Context>,
		Context
	>
): TRPCQueryOptions<Path> => {
	const trpcContext = trpc.useContext();
	return React.useMemo(() => {
		const args = [trpcContext, context] as any;
		return {
			onError: onError?.(...args),
			onSettled: onSettled?.(...args),
			onSuccess: onSuccess?.(...args),
		};
	}, [trpcContext, context, onError, onSettled, onSuccess]);
};
