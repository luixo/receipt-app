import { useMutationState } from "@tanstack/react-query";
import { getMutationKey } from "@trpc/react-query";

import type {
	TRPCDecoratedMutation,
	TRPCMutation,
	TRPCMutationInput,
	TRPCMutationKey,
	TRPCMutationState,
} from "~app/trpc";

export const useTrpcMutationStates = <Key extends TRPCMutationKey>(
	procedure: TRPCDecoratedMutation<Key>,
	predicate: (
		variables: TRPCMutationInput<Key>,
		mutation: TRPCMutation<Key>,
	) => boolean,
) =>
	useMutationState<TRPCMutationState<Key>>({
		filters: {
			predicate: (mutation: TRPCMutation<Key>) => {
				if (!mutation.state.variables) {
					return false;
				}
				return predicate(mutation.state.variables, mutation);
			},
			mutationKey: getMutationKey(procedure),
		},
	});

export const useTrpcMutationState = <Key extends TRPCMutationKey>(
	...args: Parameters<typeof useTrpcMutationStates<Key>>
) => {
	const states = useTrpcMutationStates(...args);
	return states[states.length - 1];
};
