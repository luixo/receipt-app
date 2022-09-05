import React from "react";

import { Button, Input, Loading } from "@nextui-org/react";
import { IoTrashBin as TrashBinIcon } from "react-icons/io5";
import { MdLink as LinkIcon, MdLinkOff as UnlinkIcon } from "react-icons/md";

import { cache } from "app/cache";
import { IconButton } from "app/components/icon-button";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import { useSingleInput } from "app/hooks/use-single-input";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { emailSchema } from "app/utils/validation";

type Props = {
	user: TRPCQueryOutput<"users.get">;
	isLoading: boolean;
};

export const UserConnectionInput: React.FC<Props> = ({ user, isLoading }) => {
	const connectionIntentionsQuery = trpc.useQuery([
		"account-connection-intentions.get-all",
	]);
	const outboundConnectionIntention =
		connectionIntentionsQuery.status === "success"
			? connectionIntentionsQuery.data.outbound.find(
					(element) => element.userId === user.remoteId
			  ) ?? null
			: undefined;

	const connectUserMutation = trpc.useMutation(
		"account-connection-intentions.add",
		useTrpcMutationOptions(cache.users.connect.mutationOptions)
	);
	const connectUser = React.useCallback(
		(email: string) =>
			connectUserMutation.mutate({
				userId: user.remoteId,
				email,
			}),
		[connectUserMutation, user.remoteId]
	);

	const {
		bindings,
		state: inputState,
		getValue,
		setValue,
	} = useSingleInput({
		initialValue: user.email ?? "",
		schema: emailSchema,
	});
	const [inputShown, setInputShown] = React.useState(Boolean(user.email));

	const cancelRequestMutation = trpc.useMutation(
		"account-connection-intentions.remove",
		useTrpcMutationOptions(cache.accountConnections.remove.mutationOptions)
	);
	const cancelRequest = useAsyncCallback(
		async (isMount) => {
			await cancelRequestMutation.mutateAsync({
				type: "userId",
				userId: user.remoteId,
			});
			if (!isMount()) {
				return;
			}
			setValue("");
			setInputShown(false);
		},
		[cancelRequestMutation, user.remoteId, setValue]
	);

	const unlinkMutation = trpc.useMutation(
		"users.unlink",
		useTrpcMutationOptions(cache.users.unlink.mutationOptions)
	);
	const unlinkUser = React.useCallback(
		() => unlinkMutation.mutate({ id: user.remoteId }),
		[unlinkMutation, user.remoteId]
	);

	if (outboundConnectionIntention === undefined) {
		if (connectionIntentionsQuery.status === "loading") {
			return <Loading />;
		}
		return (
			<Button color="error" onClick={() => connectionIntentionsQuery.refetch()}>
				{connectionIntentionsQuery.error?.message}
			</Button>
		);
	}

	if (outboundConnectionIntention) {
		const mutationError = cancelRequestMutation.error?.message;
		return (
			<Input
				label="Outbound request"
				value={outboundConnectionIntention.email}
				readOnly
				helperColor="error"
				helperText={mutationError}
				contentRight={
					<IconButton
						title="Cancel request"
						light
						isLoading={cancelRequestMutation.isLoading}
						color="error"
						icon={<TrashBinIcon size={24} />}
						onClick={cancelRequest}
					/>
				}
			/>
		);
	}

	if (!inputShown) {
		return (
			<Button onClick={() => setInputShown(true)} disabled={isLoading}>
				Connect to an account
			</Button>
		);
	}

	const mutationError =
		connectUserMutation.error?.message || unlinkMutation.error?.message;
	return (
		<Input
			{...bindings}
			label="Email"
			disabled={connectUserMutation.isLoading || isLoading}
			readOnly={Boolean(user.email)}
			status={inputState.error ? "warning" : undefined}
			helperColor={inputState.error ? "warning" : "error"}
			helperText={inputState.error?.message || mutationError}
			contentRightStyling={connectUserMutation.isLoading}
			contentRight={
				<>
					{user.email ? (
						<IconButton
							title="Unlink user from email"
							light
							isLoading={unlinkMutation.isLoading}
							icon={<UnlinkIcon size={24} />}
							onClick={unlinkUser}
						/>
					) : (
						<IconButton
							title="Link user to email"
							light
							isLoading={connectUserMutation.isLoading}
							disabled={Boolean(inputState.error)}
							onClick={() => connectUser(getValue())}
							icon={<LinkIcon size={24} />}
						/>
					)}
				</>
			}
		/>
	);
};
