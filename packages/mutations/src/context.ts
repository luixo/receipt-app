import type { UseTRPCMutationOptions } from "@trpc/react-query/shared";

import type {
	TRPCError,
	TRPCMutationInput,
	TRPCMutationKey,
	TRPCMutationOutput,
} from "~app/trpc";
import type { MaybeAddElementToArray } from "~utils";

import type { ControllerContext } from "./types";

export type TRPCMutationOptions<
	Path extends TRPCMutationKey,
	LifecycleContext = unknown,
> = UseTRPCMutationOptions<
	TRPCMutationInput<Path>,
	TRPCError,
	TRPCMutationOutput<Path>,
	LifecycleContext
>;

/*
Context passed around in query hooks is complicated.

There is `outerContext` which represents data from the component that uses the hook.
E.g.: while updating a debt, we need to know what the previous debt was.

There is `lifecycleContext` which represents data passed as the result of mutation to success / error fns.
E.g.: while adding a debt, we created a random id for it, on success we need to find that debt and replace the id to a proper one.

There is `controllerContext` which is the object with `queryClient` and `trpcUtils` included.
E.g.: while updating a user, we need `trpcUtils` to optimistically update that user's data in the query cache.

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

export type InternalContext<
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
