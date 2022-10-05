import React from "react";

import { MutationOptions } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import {
	trpc,
	TRPCError,
	TRPCMutationInput,
	TRPCMutationKey,
	TRPCMutationOutput,
	TRPCReactContext,
} from "app/trpc";
import { MaybeAddElementToArray } from "app/utils/types";

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
	revertFn?: () => void;
	finalizeFn?: () => void;
	context?: LifecycleContext;
};

type WrappedMutationOptions<
	Path extends TRPCMutationKey,
	LifecycleContext = unknown
> = TRPCMutationOptions<Path, WrappedContext<LifecycleContext>>;

type ToastArgs<Context> = MaybeAddElementToArray<[], Context>;

type Contexts<Context = undefined> = MaybeAddElementToArray<
	[TRPCReactContext],
	Context
>;

type ToastOptions = {
	text: string;
};

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
	mutateToastOptions?:
		| ToastOptions
		| ((
				...contextArgs: ToastArgs<Context>
		  ) => (
				...args: Parameters<NonNullable<WrappedOptions["onMutate"]>>
		  ) => ToastOptions | undefined);
	onMutate?: (
		...args: Contexts<Context>
	) => NonNullable<WrappedOptions["onMutate"]>;
	errorToastOptions:
		| ToastOptions
		| ((
				...contextArgs: ToastArgs<Context>
		  ) => (
				...args: Parameters<NonNullable<Options["onError"]>>
		  ) => ToastOptions);
	onError?: (...args: Contexts<Context>) => NonNullable<Options["onError"]>;
	successToastOptions?:
		| ToastOptions
		| ((
				...contextArgs: ToastArgs<Context>
		  ) => (
				...args: Parameters<NonNullable<Options["onSuccess"]>>
		  ) => ToastOptions | undefined);
	onSuccess?: (...args: Contexts<Context>) => NonNullable<Options["onSuccess"]>;
	onSettled?: (...args: Contexts<Context>) => NonNullable<Options["onSettled"]>;
};

export const useTrpcMutationOptions = <
	Path extends TRPCMutationKey = TRPCMutationKey,
	Context = undefined,
	LifecycleContext = unknown
>(
	{
		mutateToastOptions,
		errorToastOptions,
		successToastOptions,
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
		const trpcArgs = [trpcContext, context] as Contexts<Context>;
		const toastArgs = [context] as ToastArgs<Context>;
		let toastId: string | undefined;
		return {
			onMutate: async (...args) => {
				const toastOptions =
					typeof mutateToastOptions === "function"
						? mutateToastOptions(...toastArgs)(...args)
						: mutateToastOptions;
				if (toastOptions) {
					toastId = toast.loading(toastOptions.text);
				}
				onMutate?.(...args);
				return onMutateTrpc?.(...trpcArgs)(...args);
			},
			onError: (error, vars, wrappedContext) => {
				const toastOptions =
					typeof errorToastOptions === "function"
						? errorToastOptions(...toastArgs)(
								error,
								vars,
								wrappedContext?.context
						  )
						: errorToastOptions;
				if (toastOptions) {
					toast.error(toastOptions.text, { id: toastId });
				}
				onError?.(error, vars, wrappedContext?.context);
				wrappedContext?.revertFn?.();
				return onErrorTrpc?.(...trpcArgs)(error, vars, wrappedContext?.context);
			},
			onSuccess: (result, vars, wrappedContext) => {
				const toastOptions =
					typeof successToastOptions === "function"
						? successToastOptions?.(...toastArgs)(
								result,
								vars,
								wrappedContext?.context
						  )
						: successToastOptions;
				if (toastOptions) {
					toast.success(toastOptions.text, { id: toastId });
				}
				onSuccess?.(result, vars, wrappedContext?.context);
				wrappedContext?.finalizeFn?.();
				return onSuccessTrpc?.(...trpcArgs)(
					result,
					vars,
					wrappedContext?.context
				);
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
		mutateToastOptions,
		errorToastOptions,
		successToastOptions,
		rest,
	]);
};
