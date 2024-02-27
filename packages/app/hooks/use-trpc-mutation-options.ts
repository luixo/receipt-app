import React from "react";

import type { MutationOptions } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import type { ControllerContext } from "~app/cache/utils";
import type {
	TRPCError,
	TRPCMutationInput,
	TRPCMutationKey,
	TRPCMutationOutput,
} from "~app/trpc";
import { trpc } from "~app/trpc";
import type { Exact, MaybeAddElementToArray } from "~app/utils/types";

export type TRPCMutationOptions<
	Path extends TRPCMutationKey,
	LifecycleContext = unknown,
> = MutationOptions<
	TRPCMutationOutput<Path>,
	TRPCError,
	TRPCMutationInput<Path>,
	LifecycleContext
>;

/*
Context passed around in query hooks is complicated.

There is `outerContext` which represents data from the component that uses the hook.
E.g.: while updating a debt, we need to know what the previous debt was.

There is `lifecycleContext` which represents data passed as the result of mutation to success / error fns.
E.g.: while adding a debt, we created a random id for it, on success we need to find that debt and replace the id to a proper one.

There is `controllerContext` which is the object with `queryClient` and `trpcContext` included.
E.g.: while updating a user, we need `trpcContext` to optimistically update that user's data in the query cache.

There is `internalContext` which is the actual lifecycle context object that is passed around.
It includes `controllerContext`, `outerContext`, `lifecycleContext`
as well as possible update functions (the ones we need to run in success / error hooks to revert or finalize the data)
as well as toast data (the id of the toast we need to update).
*/

type ControllerContextWith<OuterContext = undefined> = MaybeAddElementToArray<
	[ControllerContext],
	OuterContext
>;

type LifecycleContextWithUpdateFns<LifecycleContext = unknown> = {
	revertFn?: () => void;
	finalizeFn?: () => void;
	context?: LifecycleContext;
};

type InternalContext<
	OuterContext = undefined,
	LifecycleContext = unknown,
> = LifecycleContextWithUpdateFns<LifecycleContext> & {
	toastId?: string;
	controllerContext: ControllerContext;
	outerContext: OuterContext;
};

type ToastArgs<OuterContext> = MaybeAddElementToArray<[], OuterContext>;

type ToastOptions = {
	text: string;
};

export type UseContextedMutationOptions<
	Path extends TRPCMutationKey,
	OuterContext = undefined,
	LifecycleContext = unknown,
	Options extends TRPCMutationOptions<
		Path,
		LifecycleContext
	> = TRPCMutationOptions<Path, LifecycleContext>,
	MutationOptionsWithUpdateFns extends TRPCMutationOptions<
		Path,
		LifecycleContextWithUpdateFns<LifecycleContext>
	> = TRPCMutationOptions<
		Path,
		LifecycleContextWithUpdateFns<LifecycleContext>
	>,
> = {
	mutateToastOptions?:
		| ToastOptions
		| ((
				...contextArgs: ToastArgs<OuterContext>
		  ) => (
				...args: Parameters<
					NonNullable<MutationOptionsWithUpdateFns["onMutate"]>
				>
		  ) => ToastOptions | undefined);
	onMutate?: (
		...args: ControllerContextWith<OuterContext>
	) => NonNullable<MutationOptionsWithUpdateFns["onMutate"]>;
	errorToastOptions:
		| ToastOptions
		| ((
				...contextArgs: ToastArgs<OuterContext>
		  ) => (
				...args: Parameters<NonNullable<Options["onError"]>>
		  ) => ToastOptions);
	onError?: (
		...args: ControllerContextWith<OuterContext>
	) => NonNullable<Options["onError"]>;
	successToastOptions?:
		| ToastOptions
		| ((
				...contextArgs: ToastArgs<OuterContext>
		  ) => (
				...args: Parameters<NonNullable<Options["onSuccess"]>>
		  ) => ToastOptions | undefined);
	onSuccess?: (
		...args: ControllerContextWith<OuterContext>
	) => NonNullable<Options["onSuccess"]>;
	onSettled?: (
		...args: ControllerContextWith<OuterContext>
	) => NonNullable<Options["onSettled"]>;
};

const getToastArgs = <OC>(
	internalContext: Pick<InternalContext<OC, unknown>, "outerContext">,
) => [internalContext.outerContext] as MaybeAddElementToArray<[], OC>;

const getTrpcArgs = <OC>(
	internalContext: Pick<
		InternalContext<OC, unknown>,
		"controllerContext" | "outerContext"
	>,
) =>
	[
		internalContext.controllerContext,
		internalContext.outerContext,
	] as MaybeAddElementToArray<[ControllerContext], OC>;

export const useTrpcMutationOptions = <
	Path extends TRPCMutationKey = TRPCMutationKey,
	OuterContext = undefined,
	LifecycleContext = unknown,
>(
	...[
		{
			mutateToastOptions,
			errorToastOptions,
			successToastOptions,
			onError: onErrorTrpc,
			onMutate: onMutateTrpc,
			onSettled: onSettledTrpc,
			onSuccess: onSuccessTrpc,
		},
		options,
	]: MaybeAddElementToArray<
		[UseContextedMutationOptions<Path, OuterContext, LifecycleContext>],
		Exact<OuterContext, undefined> extends never
			? TRPCMutationOptions<Path, LifecycleContext> & { context: OuterContext }
			:
					| (TRPCMutationOptions<Path, LifecycleContext> & {
							context?: OuterContext;
					  })
					| undefined
	>
): TRPCMutationOptions<
	Path,
	InternalContext<OuterContext, LifecycleContext>
> => {
	const {
		context: pinnedOuterContext,
		onError,
		onMutate,
		onSettled,
		onSuccess,
		...rest
	} = options || {};
	const trpcContext = trpc.useContext();
	const queryClient = useQueryClient();
	return React.useMemo(
		() => ({
			onMutate: async (...args) => {
				const partialInternalContext: Pick<
					InternalContext<OuterContext, LifecycleContext>,
					"controllerContext" | "outerContext"
				> = {
					controllerContext: { queryClient, trpcContext },
					outerContext: pinnedOuterContext!,
				};
				let toastId: string | undefined;
				const toastOptions =
					typeof mutateToastOptions === "function"
						? mutateToastOptions(...getToastArgs(partialInternalContext))(
								...args,
						  )
						: mutateToastOptions;
				if (toastOptions) {
					toastId = toast.loading(toastOptions.text);
				}
				await onMutate?.(...args);
				const lifecycleContextWithUpdateFns = await onMutateTrpc?.(
					...getTrpcArgs(partialInternalContext),
				)(...args);
				return {
					...partialInternalContext,
					...lifecycleContextWithUpdateFns,
					toastId,
				};
			},
			onError: (error, vars, internalContext) => {
				const {
					toastId,
					context: lifecycleContext,
					revertFn,
				} = internalContext!;
				const toastOptions =
					typeof errorToastOptions === "function"
						? errorToastOptions(...getToastArgs(internalContext!))(
								error,
								vars,
								lifecycleContext,
						  )
						: errorToastOptions;
				if (toastOptions) {
					toast.error(toastOptions.text, { id: toastId });
				} else {
					toast.dismiss(toastId);
				}
				onError?.(error, vars, lifecycleContext);
				revertFn?.();
				return onErrorTrpc?.(...getTrpcArgs(internalContext!))(
					error,
					vars,
					lifecycleContext,
				);
			},
			onSuccess: (result, vars, internalContext) => {
				const {
					toastId,
					context: lifecycleContext,
					finalizeFn,
				} = internalContext!;
				const toastOptions =
					typeof successToastOptions === "function"
						? successToastOptions?.(...getToastArgs(internalContext!))(
								result,
								vars,
								lifecycleContext,
						  )
						: successToastOptions;
				if (toastOptions) {
					toast.success(toastOptions.text, { id: toastId });
				} else {
					toast.dismiss(toastId);
				}
				onSuccess?.(result, vars, lifecycleContext);
				finalizeFn?.();
				return onSuccessTrpc?.(...getTrpcArgs(internalContext!))(
					result,
					vars,
					lifecycleContext,
				);
			},
			onSettled: (result, error, vars, internalContext) => {
				const { context: lifecycleContext } = internalContext!;
				onSettled?.(result, error, vars, lifecycleContext);
				return onSettledTrpc?.(...getTrpcArgs(internalContext!))(
					result,
					error,
					vars,
					lifecycleContext,
				);
			},
			...rest,
		}),
		[
			trpcContext,
			queryClient,
			pinnedOuterContext,
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
		],
	);
};
