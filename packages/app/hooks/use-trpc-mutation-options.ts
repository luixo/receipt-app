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
	LifecycleContext = unknown,
	Context = undefined
> = {
	onMutate?: (
		...args: WithContextIfExists<TRPCReactContext, Context>
	) => TRPCMutationOptions<Path, LifecycleContext>["onMutate"];
	onError?: (
		...args: WithContextIfExists<TRPCReactContext, Context>
	) => TRPCMutationOptions<Path, LifecycleContext>["onError"];
	onSuccess?: (
		...args: WithContextIfExists<TRPCReactContext, Context>
	) => TRPCMutationOptions<Path, LifecycleContext>["onSuccess"];
	onSettled?: (
		...args: WithContextIfExists<TRPCReactContext, Context>
	) => TRPCMutationOptions<Path, LifecycleContext>["onSettled"];
};

export const useTrpcMutationOptions = <
	Path extends TRPCMutationKey,
	LifecycleContext = unknown,
	Context = undefined
>(
	{
		onError,
		onMutate,
		onSettled,
		onSuccess,
	}: UseContextedMutationOptions<Path, LifecycleContext, Context>,
	{
		context,
	}: {
		context?: Context;
	} = {}
): TRPCMutationOptions<Path, LifecycleContext> => {
	const trpcContext = trpc.useContext();
	return React.useMemo(() => {
		const args = [trpcContext, context] as any;
		return {
			onMutate: onMutate?.(...args),
			onError: onError?.(...args),
			onSettled: onSettled?.(...args),
			onSuccess: onSuccess?.(...args),
		};
	}, [trpcContext, context, onMutate, onError, onSettled, onSuccess]);
};
