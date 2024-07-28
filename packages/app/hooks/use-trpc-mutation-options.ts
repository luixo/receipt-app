import React from "react";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import type { TRPCMutationKey } from "~app/trpc";
import { trpc } from "~app/trpc";
import type {
	ControllerContext,
	InternalContext,
	TRPCMutationOptions,
	UseContextedMutationOptions,
} from "~mutations";
import type { Exact, MaybeAddElementToArray } from "~utils";

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
					controllerContext: { queryClient, trpcContext, trpc },
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
								lifecycleContext!,
						  )
						: successToastOptions;
				if (toastOptions) {
					toast.success(toastOptions.text, { id: toastId });
				} else {
					toast.dismiss(toastId);
				}
				onSuccess?.(result, vars, lifecycleContext!);
				finalizeFn?.();
				return onSuccessTrpc?.(...getTrpcArgs(internalContext!))(
					result,
					vars,
					lifecycleContext!,
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
