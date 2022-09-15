import React from "react";

import { MutationOptions } from "@tanstack/react-query";

import {
	trpc,
	TRPCError,
	TRPCMutationInput,
	TRPCMutationKey,
	TRPCMutationOutput,
	TRPCReactContext,
} from "app/trpc";

export type TRPCMutationOptions<
	Path extends TRPCMutationKey,
	LifecycleContext = unknown
> = MutationOptions<
	TRPCMutationOutput<Path>,
	TRPCError,
	TRPCMutationInput<Path>,
	LifecycleContext
>;

export type WithContextIfExists<
	T,
	Context = undefined
> = undefined extends Context ? [T] : [T, Context];

export type UseContextedMutationOptions<
	Path extends TRPCMutationKey,
	OuterLifecycleContext = unknown,
	Context = undefined
> = {
	onMutate?: (
		...args: WithContextIfExists<TRPCReactContext, Context>
	) => NonNullable<
		TRPCMutationOptions<Path, OuterLifecycleContext>["onMutate"]
	>;
	onError?: (
		...args: WithContextIfExists<TRPCReactContext, Context>
	) => NonNullable<TRPCMutationOptions<Path, OuterLifecycleContext>["onError"]>;
	onSuccess?: (
		...args: WithContextIfExists<TRPCReactContext, Context>
	) => NonNullable<
		TRPCMutationOptions<Path, OuterLifecycleContext>["onSuccess"]
	>;
	onSettled?: (
		...args: WithContextIfExists<TRPCReactContext, Context>
	) => NonNullable<
		TRPCMutationOptions<Path, OuterLifecycleContext>["onSettled"]
	>;
};

export const useTrpcMutationOptions = <
	Path extends TRPCMutationKey = TRPCMutationKey,
	LifecycleContext = unknown,
	Context = undefined
>(
	{
		onError: onErrorTrpc,
		onMutate: onMutateTrpc,
		onSettled: onSettledTrpc,
		onSuccess: onSuccessTrpc,
	}: UseContextedMutationOptions<Path, LifecycleContext, Context>,
	{
		context,
		onError,
		onMutate,
		onSettled,
		onSuccess,
		...rest
	}: {
		context?: Context;
	} & TRPCMutationOptions<Path, LifecycleContext> = {}
): TRPCMutationOptions<Path, LifecycleContext> => {
	const trpcContext = trpc.useContext();
	return React.useMemo(() => {
		const trpcArgs = [trpcContext, context] as any;
		return {
			onMutate: async (...args) => {
				onMutate?.(...args);
				return onMutateTrpc?.(...trpcArgs)(...args);
			},
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
		onMutate,
		onError,
		onSettled,
		onSuccess,
		onMutateTrpc,
		onErrorTrpc,
		onSettledTrpc,
		onSuccessTrpc,
		rest,
	]);
};
