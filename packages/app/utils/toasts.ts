import Dataloader from "dataloader";

import type { TRPCMutationKey } from "~app/trpc";
import { addToast, getToastQueue } from "~components/toast";
import type {
	LifecycleContextWithUpdateFns,
	TRPCMutationOptions,
	ToastContext,
	ToastObject,
	ToastOptions,
	UseContextedMutationOptions,
} from "~mutations/context";
import type { ArrayOf, MaybeAddElementToArray } from "~utils/types";

const DELAYS = {
	// Mutation are fired nearly simultaneously
	mutate: 10,
	// Success and errors might wait out a bit
	success: 300,
	error: 300,
};

type OnLifecycle<
	K extends "onMutate" | "onSuccess" | "onError",
	Path extends TRPCMutationKey,
	LifecycleContext = unknown,
> = Parameters<NonNullable<TRPCMutationOptions<Path, LifecycleContext>[K]>>;
type OptionsLocal<
	Path extends TRPCMutationKey,
	OuterContext = undefined,
	LifecycleContext = unknown,
> = {
	toastArgs: MaybeAddElementToArray<[], OuterContext>;
	mutateArgs: OnLifecycle<
		"onMutate",
		Path,
		LifecycleContextWithUpdateFns<LifecycleContext>
	>;
	successArgs: OnLifecycle<"onSuccess", Path, LifecycleContext>;
	errorArgs: OnLifecycle<"onError", Path, LifecycleContext>;
	toastObject?: ToastObject;
};
type MutateOptionsKey = "toastArgs" | "mutateArgs";
type ErrorOptionsKey = "toastArgs" | "errorArgs" | "toastObject";
type SuccessOptionsKey = "toastArgs" | "successArgs" | "toastObject";

type Dataloaders<
	Path extends TRPCMutationKey,
	OuterContext = undefined,
	LifecycleContext = unknown,
	Options extends OptionsLocal<
		Path,
		OuterContext,
		LifecycleContext
	> = OptionsLocal<Path, OuterContext, LifecycleContext>,
> = {
	mutateDataloader: Dataloader<
		Pick<Options, MutateOptionsKey>,
		ToastObject | undefined,
		string
	>;
	errorDataloader: Dataloader<Pick<Options, ErrorOptionsKey>, void, string>;
	successDataloader: Dataloader<Pick<Options, SuccessOptionsKey>, void, string>;
};

const dataloaderStorage: Partial<{
	[Path in TRPCMutationKey]: Dataloaders<Path>;
}> = {};

const createArrayOf = <T extends object, R extends unknown[]>(
	inputs: readonly T[],
	extract: (input: T) => R,
): ArrayOf<R> => {
	if (!inputs[0]) {
		throw new Error(`Creating ArrayOf requires at least 1 element`);
	}
	return extract(inputs[0]).map((_, index) =>
		inputs.map((input) => extract(input)[index]),
	) as ArrayOf<R>;
};

const createDataloader = <
	Input extends object,
	Output,
	OuterContextArgs extends unknown[],
	ActionArgs extends unknown[],
>(
	key: string,
	delay: number,
	getOptions: (
		...args1: ArrayOf<OuterContextArgs>
	) => (...args2: ArrayOf<ActionArgs>) => ToastOptions | undefined,
	getOuterContext: (input: Input) => OuterContextArgs,
	getActionArgs: (input: Input) => ActionArgs,
	runResult: (result: ToastOptions, inputs: readonly Input[]) => Output,
	runPre?: (inputs: readonly Input[]) => void,
) =>
	new Dataloader<Input, Output | undefined, string>(
		async (inputs) => {
			runPre?.(inputs);
			const outerContext = createArrayOf(inputs, getOuterContext);
			const actionArgs = createArrayOf(inputs, getActionArgs);
			const toastOptions =
				typeof getOptions === "function"
					? getOptions(...outerContext)(...actionArgs)
					: getOptions;
			if (!toastOptions) {
				return inputs.map(() => undefined);
			}
			const result = runResult(toastOptions, inputs);
			return inputs.map(() => result);
		},
		{
			batchScheduleFn: (callback) => setTimeout(callback, delay),
			cacheKeyFn: JSON.stringify,
			name: key,
			// We don't want to memoize the response of dataloader as dataloader is just a batcher here
			cache: false,
		},
	);

export const getMutationToaster = <
	Path extends TRPCMutationKey,
	OuterContext = undefined,
	LifecycleContext = unknown,
	Options extends OptionsLocal<
		Path,
		OuterContext,
		LifecycleContext
	> = OptionsLocal<Path, OuterContext, LifecycleContext>,
>(
	key: Path,
	toastContext: ToastContext,
	mutateToastOptions: UseContextedMutationOptions<
		Path,
		OuterContext,
		LifecycleContext
	>["mutateToastOptions"],
	errorToastOptions: UseContextedMutationOptions<
		Path,
		OuterContext,
		LifecycleContext
	>["errorToastOptions"],
	successToastOptions: UseContextedMutationOptions<
		Path,
		OuterContext,
		LifecycleContext
	>["successToastOptions"],
) => {
	const dataloaders: Dataloaders<Path, OuterContext, LifecycleContext> =
		(dataloaderStorage[key] as
			| Dataloaders<Path, OuterContext, LifecycleContext>
			| undefined) || {
			mutateDataloader: createDataloader<
				Pick<Options, MutateOptionsKey>,
				{ id: string; count: number },
				Options["toastArgs"],
				Options["mutateArgs"]
			>(
				key,
				DELAYS.mutate,
				(...toastArgs) =>
					(
						...mutateArgs: ArrayOf<
							OnLifecycle<"onMutate", Path, LifecycleContext>
						>
					) => {
						if (!mutateToastOptions) {
							return;
						}
						return mutateToastOptions(
							toastContext,
							...toastArgs,
						)(...mutateArgs);
					},
				(input) => input.toastArgs,
				(input) => input.mutateArgs,
				(result, inputs) => {
					const toastId = addToast({
						title: toastContext.t("toasts.header.mutate"),
						description: result.text,
						timeout: Infinity,
					});
					// We always have a toast queue
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					return { id: toastId!, count: inputs.length };
				},
			),
			errorDataloader: createDataloader<
				Pick<Options, ErrorOptionsKey>,
				void,
				Options["toastArgs"],
				Options["errorArgs"]
			>(
				key,
				DELAYS.error,
				(...toastArgs) =>
					(
						...errorArgs: ArrayOf<
							OnLifecycle<"onError", Path, LifecycleContext>
						>
					) =>
						errorToastOptions(toastContext, ...toastArgs)(...errorArgs),
				(input) => input.toastArgs,
				(input) => input.errorArgs,
				(result) => {
					addToast({
						title: toastContext.t("toasts.header.error"),
						description: result.text,
						color: "danger",
					});
				},
				(inputs) => {
					const toastObject = inputs[0]?.toastObject;
					if (!toastObject) {
						return;
					}
					toastObject.count -= inputs.length;
					if (toastObject.count === 0) {
						getToastQueue().close(toastObject.id);
					}
				},
			),
			successDataloader: createDataloader<
				Pick<Options, SuccessOptionsKey>,
				void,
				Options["toastArgs"],
				Options["successArgs"]
			>(
				key,
				DELAYS.success,
				(...toastArgs) =>
					(
						...successArgs: ArrayOf<
							OnLifecycle<"onSuccess", Path, LifecycleContext>
						>
					) =>
						successToastOptions?.(toastContext, ...toastArgs)(...successArgs),
				(input) => input.toastArgs,
				(input) => input.successArgs,
				(result) => {
					addToast({
						title: toastContext.t("toasts.header.success"),
						description: result.text,
						color: "success",
					});
				},
				(inputs) => {
					const toastObject = inputs[0]?.toastObject;
					if (!toastObject) {
						return;
					}
					toastObject.count -= inputs.length;
					if (toastObject.count === 0) {
						getToastQueue().close(toastObject.id);
					}
				},
			),
		};
	dataloaderStorage[key] = dataloaders as unknown as Dataloaders<Path>;
	return {
		mutateToast: (input: Pick<Options, MutateOptionsKey>) =>
			dataloaders.mutateDataloader.load(input),
		errorToast: (input: Pick<Options, ErrorOptionsKey>) =>
			dataloaders.errorDataloader.load(input),
		successToast: (input: Pick<Options, SuccessOptionsKey>) =>
			dataloaders.successDataloader.load(input),
	};
};
