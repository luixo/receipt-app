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
	internalContext: Pick<InternalContext<OC>, "outerContext">,
) => [internalContext.outerContext] as MaybeAddElementToArray<[], OC>;

const getTrpcArgs = <OC>(
	internalContext: Pick<
		InternalContext<OC>,
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
					// We're sure outerContext exists here (if needed)
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
				// We're sure `internalContext` exists here
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const sureInternalContext = internalContext!;
				const {
					toastId,
					context: lifecycleContext,
					revertFn,
				} = sureInternalContext;
				const toastOptions =
					typeof errorToastOptions === "function"
						? errorToastOptions(...getToastArgs(sureInternalContext))(
								error,
								vars,
								lifecycleContext,
						  )
						: errorToastOptions;
				toast.error(toastOptions.text, { id: toastId });
				onError?.(error, vars, lifecycleContext);
				revertFn?.();
				return onErrorTrpc?.(...getTrpcArgs(sureInternalContext))(
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
				} = internalContext;
				// We're sure `lifecycleContext` exists here
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const sureLifecycleContext = lifecycleContext!;
				const toastOptions =
					typeof successToastOptions === "function"
						? successToastOptions(...getToastArgs(internalContext))(
								result,
								vars,
								sureLifecycleContext,
						  )
						: successToastOptions;
				if (toastOptions) {
					toast.success(toastOptions.text, { id: toastId });
				} else {
					toast.dismiss(toastId);
				}
				onSuccess?.(result, vars, sureLifecycleContext);
				finalizeFn?.();
				return onSuccessTrpc?.(...getTrpcArgs(internalContext))(
					result,
					vars,
					sureLifecycleContext,
				);
			},
			onSettled: (result, error, vars, internalContext) => {
				// We're sure `internalContext` exists here
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const sureInternalContext = internalContext!;
				const { context: lifecycleContext } = sureInternalContext;
				onSettled?.(result, error, vars, lifecycleContext);
				return onSettledTrpc?.(...getTrpcArgs(sureInternalContext))(
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
