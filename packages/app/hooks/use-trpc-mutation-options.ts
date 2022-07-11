import React from "react";
import { MutationOptions } from "react-query";
import {
	trpc,
	TRPCError,
	TRPCMutationInput,
	TRPCMutationKey,
	TRPCMutationOutput,
	TRPCReactContext,
} from "../trpc";

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
> = Context extends undefined ? [T] : [T, Context];

export type UseContextedMutationOptions<
	Path extends TRPCMutationKey,
	LifecycleContext,
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
	LifecycleContext,
	Context = undefined
>(
	...[
		{ onError, onMutate, onSettled, onSuccess },
		context,
	]: WithContextIfExists<
		UseContextedMutationOptions<Path, LifecycleContext, Context>,
		Context
	>
): TRPCMutationOptions<Path, LifecycleContext> => {
	const trpcContext = trpc.useContext();
	const args = React.useMemo<WithContextIfExists<TRPCReactContext, Context>>(
		() =>
			[trpcContext, context] as WithContextIfExists<TRPCReactContext, Context>,
		[trpcContext, context]
	);
	return React.useMemo(
		() => ({
			onMutate: onMutate?.(...args),
			onError: onError?.(...args),
			onSettled: onSettled?.(...args),
			onSuccess: onSuccess?.(...args),
		}),
		[args, onMutate, onError, onSettled, onSuccess]
	);
};
