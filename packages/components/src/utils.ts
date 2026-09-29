import clsx from "clsx";
import type { ClassValue } from "clsx";
import { isNonNullish } from "remeda";
import { twMerge } from "tailwind-merge";

import type { TRPCMutationResult, TRPCMutationState } from "~app/trpc";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type PropertyKey = string | number | symbol;
type Issue = {
	readonly message: string;
	readonly path?: readonly (PropertyKey | { key: PropertyKey })[] | undefined;
};

export type FieldError = (Issue | undefined) | (Issue | undefined)[];

// oxlint-disable-next-line typescript/no-explicit-any
type MutationOrState = TRPCMutationResult<any> | TRPCMutationState<any>;
type ValueOrArray<T> = T | T[];
export type MutationsProp = ValueOrArray<MutationOrState | undefined>;

export const getMutationLoading = (mutation?: MutationsProp) => {
	const mutations = (
		Array.isArray(mutation) ? mutation : mutation ? [mutation] : []
	).filter(isNonNullish);
	return mutations.some(({ status }) => status === "pending");
};

export const getErrorState = ({
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
			fieldErrorMessages.length === 0 ? mutationMessages : fieldErrorMessages,
	};
};
