import React from "react";

import { RemoveButton } from "app/components/remove-button";
import { useRouter } from "app/hooks/use-router";
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
		useTrpcMutationOptions(mutations.users.remove.options, {
			onSuccess: () => router.replace("/users"),
		}),
	);
	React.useEffect(
		() => setLoading(removeUserMutation.isLoading),
		[removeUserMutation.isLoading, setLoading],
	);
	const removeUser = React.useCallback(
		() => removeUserMutation.mutate({ id: user.remoteId }),
		[removeUserMutation, user.remoteId],
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
