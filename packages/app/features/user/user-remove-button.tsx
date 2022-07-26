import React from "react";

import { useRouter } from "solito/router";

import { cache } from "app/cache";
import { RemoveButton } from "app/components/remove-button";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";

type Props = {
	user: TRPCQueryOutput<"users.get">;
	setLoading: (nextLoading: boolean) => void;
};

export const UserRemoveButton: React.FC<Props> = ({ user, setLoading }) => {
	const router = useRouter();
	const deleteUserMutation = trpc.useMutation(
		"users.delete",
		useTrpcMutationOptions(cache.users.delete.mutationOptions)
	);
	React.useEffect(
		() => setLoading(deleteUserMutation.isLoading),
		[deleteUserMutation.isLoading, setLoading]
	);
	const deleteUser = useAsyncCallback(
		async (isMount) => {
			await deleteUserMutation.mutateAsync({ id: user.id });
			if (!isMount()) {
				return;
			}
			router.replace("/users");
		},
		[deleteUserMutation, user.id]
	);

	return (
		<RemoveButton mutation={deleteUserMutation} onRemove={deleteUser}>
			Remove receipt
		</RemoveButton>
	);
};
