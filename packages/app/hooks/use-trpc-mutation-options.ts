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

type WrappedContext<LifecycleContext = unknown> = {
	revertFns: (() => void)[];
	context?: LifecycleContext;
};

type WrappedMutationOptions<
	Path extends TRPCMutationKey,
	LifecycleContext = unknown
> = TRPCMutationOptions<Path, WrappedContext<LifecycleContext>>;

export type WithContextIfExists<
	T,
	Context = undefined
> = undefined extends Context ? [T] : [T, Context];

export type UseContextedMutationOptions<
	Path extends TRPCMutationKey,
	Context = undefined,
	LifecycleContext = unknown,
	Options extends TRPCMutationOptions<
		Path,
		LifecycleContext
	> = TRPCMutationOptions<Path, LifecycleContext>,
	WrappedOptions extends WrappedMutationOptions<
		Path,
		LifecycleContext
	> = WrappedMutationOptions<Path, LifecycleContext>
> = {
	onMutate?: (
		...args: WithContextIfExists<TRPCReactContext, Context>
	) => NonNullable<WrappedOptions["onMutate"]>;
	onError?: (
		...args: WithContextIfExists<TRPCReactContext, Context>
	) => NonNullable<Options["onError"]>;
	onSuccess?: (
		...args: WithContextIfExists<TRPCReactContext, Context>
	) => NonNullable<Options["onSuccess"]>;
	onSettled?: (
		...args: WithContextIfExists<TRPCReactContext, Context>
	) => NonNullable<Options["onSettled"]>;
};

export const useTrpcMutationOptions = <
	Path extends TRPCMutationKey = TRPCMutationKey,
	Context = undefined,
	LifecycleContext = unknown
>(
	{
		onError: onErrorTrpc,
		onMutate: onMutateTrpc,
		onSettled: onSettledTrpc,
		onSuccess: onSuccessTrpc,
	}: UseContextedMutationOptions<Path, Context, LifecycleContext>,
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
): TRPCMutationOptions<Path, WrappedContext<LifecycleContext>> => {
	const trpcContext = trpc.useContext();
	return React.useMemo(() => {
		const trpcArgs = [trpcContext, context] as any;
		return {
			onMutate: async (...args) => {
				onMutate?.(...args);
				return onMutateTrpc?.(...trpcArgs)(...args);
			},
			onError: (error, vars, wrappedContext) => {
				onError?.(error, vars, wrappedContext?.context);
				wrappedContext?.revertFns.forEach((fn) => fn());
				return onErrorTrpc?.(...trpcArgs)(error, vars, wrappedContext?.context);
			},
			onSettled: (result, error, vars, wrappedContext) => {
				onSettled?.(result, error, vars, wrappedContext?.context);
				return onSettledTrpc?.(...trpcArgs)(
					result,
					error,
					vars,
					wrappedContext?.context
				);
			},
			onSuccess: (result, vars, wrappedContext) => {
				onSuccess?.(result, vars, wrappedContext?.context);
				return onSuccessTrpc?.(...trpcArgs)(
					result,
					vars,
					wrappedContext?.context
				);
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
