import type { MutationFilters, MutationKey } from "@tanstack/react-query";
import { useMutationState } from "@tanstack/react-query";

import type {
	TRPCError,
	TRPCMutation,
	TRPCMutationInput,
	TRPCMutationKey,
	TRPCMutationOutput,
	TRPCMutationState,
} from "~app/trpc";

export const useTrpcMutationStates = <Key extends TRPCMutationKey>(
	mutationKey: MutationKey,
	predicate: (
		variables: TRPCMutationInput<Key>,
		mutation: TRPCMutation<Key>,
	) => boolean,
) => {
	const filters: MutationFilters<
		TRPCMutationOutput<Key>,
		TRPCError,
		TRPCMutationInput<Key>
	> = {
		predicate: (mutation: TRPCMutation<Key>) => {
			if (!mutation.state.variables) {
				return false;
			}
			return predicate(mutation.state.variables, mutation);
		},
		mutationKey,
	};
	return useMutationState<TRPCMutationState<Key>>({
		// A bug in tanstack query: https://github.com/TanStack/query/issues/8395
		filters: filters as unknown as MutationFilters,
	});
};

export const useTrpcMutationState = <Key extends TRPCMutationKey>(
	...args: Parameters<typeof useTrpcMutationStates<Key>>
) => {
	const states = useTrpcMutationStates(...args);
	return states.at(-1);
};
