import React from "react";

import { useRouter } from "solito/router";

import { RemoveButton } from "app/components/remove-button";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc, TRPCQueryOutput } from "app/trpc";

type Props = {
	user: TRPCQueryOutput<"users.get">;
	setLoading: (nextLoading: boolean) => void;
} & Omit<
	React.ComponentProps<typeof RemoveButton>,
	"mutation" | "onRemove" | "subtitle"
>;

export const UserRemoveButton: React.FC<Props> = ({
	user,
	setLoading,
	...props
}) => {
	const router = useRouter();
	const removeUserMutation = trpc.users.remove.useMutation(
		useTrpcMutationOptions(mutations.users.remove.options)
	);
	React.useEffect(
		() => setLoading(removeUserMutation.isLoading),
		[removeUserMutation.isLoading, setLoading]
	);
	const removeUser = useAsyncCallback(
		async (isMount) => {
			await removeUserMutation.mutateAsync({ id: user.remoteId });
			if (!isMount()) {
				return;
			}
			router.replace("/users");
		},
		[removeUserMutation, user.remoteId, router]
	);

	return (
		<RemoveButton
			mutation={removeUserMutation}
			onRemove={removeUser}
			subtitle="This will remove user and all his participations"
			{...props}
		>
			Remove user
		</RemoveButton>
	);
};
