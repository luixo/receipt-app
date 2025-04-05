import type { StandardSchemaV1Issue } from "@tanstack/react-form";
import { isNonNullish } from "remeda";

import type { TRPCMutationResult, TRPCMutationState } from "~app/trpc";

export { cn, tv, HeroUIProvider } from "@heroui/react";

export type FieldError =
	| (StandardSchemaV1Issue | undefined)
	| (StandardSchemaV1Issue | undefined)[];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MutationOrState = TRPCMutationResult<any> | TRPCMutationState<any>;
type ValueOrArray<T> = T | T[];
export type MutationsProp = ValueOrArray<MutationOrState | undefined>;

export const useMutationLoading = ({
	mutation,
}: {
	mutation?: MutationsProp;
}) => {
	const mutations = (
		Array.isArray(mutation) ? mutation : mutation ? [mutation] : []
	).filter(isNonNullish);
	return mutations.some(({ status }) => status === "pending");
};

export const useErrorState = ({
	mutation,
	fieldError,
}: {
	mutation?: MutationsProp;
	fieldError?: FieldError;
}) => {
	const mutations = (
		Array.isArray(mutation) ? mutation : mutation ? [mutation] : []
	).filter(isNonNullish);
	const fieldErrorMessages = (
		Array.isArray(fieldError) ? fieldError : [fieldError].filter(Boolean)
	)
		.filter(isNonNullish)
		.map(({ message }) => message)
		.filter(isNonNullish);
	const mutationMessages = mutations
		.map(({ error }) => error?.message)
		.filter(isNonNullish);
	return {
		isWarning: fieldErrorMessages.length !== 0,
		isError: mutationMessages.length !== 0,
		errors:
			fieldErrorMessages.length !== 0 ? fieldErrorMessages : mutationMessages,
	};
};
