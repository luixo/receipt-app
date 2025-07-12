import React from "react";

import { skipToken, useQueryClient } from "@tanstack/react-query";

import type { TRPCMutationKey } from "~app/trpc";
import { useTRPC } from "~app/utils/trpc";
import { addToast, getToastQueue } from "~components/toast";
import type {
	InternalContext,
	TRPCMutationOptions,
	UseContextedMutationOptions,
} from "~mutations/context";
import type { ControllerContext } from "~mutations/types";
import type { Exact, MaybeAddElementToArray } from "~utils/types";

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
			? TRPCMutationOptions<Path, LifecycleContext> & {
					context: OuterContext | typeof skipToken;
				}
			:
					| (TRPCMutationOptions<Path, LifecycleContext> & {
							context?: OuterContext | typeof skipToken;
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
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	return React.useMemo(
		() => ({
			onMutate: async (...args) => {
				if (pinnedOuterContext === skipToken) {
					throw new Error(
						`Expected to have context in "${JSON.stringify(
							rest.mutationKey,
						)}" mutation, got skipToken`,
					);
				}
				const partialInternalContext: Pick<
					InternalContext<OuterContext, LifecycleContext>,
					"controllerContext" | "outerContext"
				> = {
					controllerContext: { queryClient, trpc },
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
					toastId = addToast({
						title: "Loading..",
						description: toastOptions.text,
						timeout: Infinity,
					});
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
				if (toastId) {
					getToastQueue().close(toastId);
				}
				addToast({
					title: "Error",
					description: toastOptions.text,
					color: "danger",
				});
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
				if (toastId) {
					getToastQueue().close(toastId);
				}
				if (toastOptions) {
					addToast({
						title: "Success",
						description: toastOptions.text,
						color: "success",
					});
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
			trpc,
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
