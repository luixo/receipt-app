import React from "react";

import { useSingleInput } from "~app/hooks/use-single-input";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { emailSchema } from "~app/utils/validation";
import { Button, Input, Spinner } from "~components";
import { LinkIcon, TrashBinIcon, UnlinkIcon } from "~components/icons";
import type { AccountsId } from "~db/models";
import { options as accountConnectionsAddOptions } from "~mutations/account-connection-intentions/add";
import { options as accountConnectionsRemoveOptions } from "~mutations/account-connection-intentions/remove";
import { options as usersUnlinkOptions } from "~mutations/users/unlink";

type Props = {
	user: TRPCQueryOutput<"users.get">;
	isLoading: boolean;
};

export const UserConnectionInput: React.FC<Props> = ({ user, isLoading }) => {
	const connectionIntentionsQuery =
		trpc.accountConnectionIntentions.getAll.useQuery();
	const outboundConnectionIntention =
		connectionIntentionsQuery.status === "success"
			? connectionIntentionsQuery.data.outbound.find(
					(element) => element.user.id === user.id,
			  ) ?? null
			: undefined;

	const connectUserMutation = trpc.accountConnectionIntentions.add.useMutation(
		useTrpcMutationOptions(accountConnectionsAddOptions),
	);
	const connectUser = React.useCallback(
		(email: string) =>
			connectUserMutation.mutate({
				userId: user.id,
				email,
			}),
		[connectUserMutation, user.id],
	);

	const {
		bindings,
		state: inputState,
		getValue,
		setValue,
	} = useSingleInput({
		initialValue: user.connectedAccount?.email ?? "",
		schema: emailSchema,
	});
	const [inputShown, setInputShown] = React.useState(
		Boolean(user.connectedAccount),
	);

	const cancelRequestMutation =
		trpc.accountConnectionIntentions.remove.useMutation(
			useTrpcMutationOptions(accountConnectionsRemoveOptions, {
				onSuccess: () => {
					setValue("");
					setInputShown(false);
				},
			}),
		);
	const cancelRequest = React.useCallback(
		(accountId: AccountsId) =>
			cancelRequestMutation.mutate({ targetAccountId: accountId }),
		[cancelRequestMutation],
	);

	const unlinkMutation = trpc.users.unlink.useMutation(
		useTrpcMutationOptions(usersUnlinkOptions),
	);
	const unlinkUser = React.useCallback(
		() => unlinkMutation.mutate({ id: user.id }),
		[unlinkMutation, user.id],
	);

	if (outboundConnectionIntention === undefined) {
		if (connectionIntentionsQuery.status === "pending") {
			return <Spinner />;
		}
		if (connectionIntentionsQuery.status === "error") {
			return (
				<Button
					color="danger"
					onClick={() => connectionIntentionsQuery.refetch()}
				>
					{connectionIntentionsQuery.error.message}
				</Button>
			);
		}
		return null;
	}

	if (outboundConnectionIntention) {
		return (
			<Input
				label="Outbound request"
				value={outboundConnectionIntention.account.email}
				isReadOnly
				mutation={cancelRequestMutation}
				endContent={
					<Button
						title="Cancel request"
						variant="light"
						isLoading={cancelRequestMutation.isPending}
						color="danger"
						isIconOnly
						onClick={() =>
							cancelRequest(outboundConnectionIntention.account.id)
						}
					>
						<TrashBinIcon size={24} />
					</Button>
				}
			/>
		);
	}

	if (!inputShown) {
		return (
			<Button
				color="primary"
				onClick={() => setInputShown(true)}
				isDisabled={isLoading}
			>
				Connect to an account
			</Button>
		);
	}

	return (
		<Input
			{...bindings}
			label="Email"
			mutation={[connectUserMutation, unlinkMutation]}
			fieldError={inputState.error}
			isDisabled={isLoading}
			isReadOnly={Boolean(user.connectedAccount)}
			endContent={
				<>
					{user.connectedAccount ? (
						<Button
							title="Unlink user from email"
							variant="light"
							isLoading={unlinkMutation.isPending}
							isIconOnly
							onClick={unlinkUser}
						>
							<UnlinkIcon size={24} />
						</Button>
					) : (
						<Button
							title="Link user to email"
							variant="light"
							isLoading={connectUserMutation.isPending}
							isDisabled={Boolean(inputState.error) || getValue().length === 0}
							onClick={() => connectUser(getValue())}
							isIconOnly
						>
							<LinkIcon size={24} />
						</Button>
					)}
				</>
			}
		/>
	);
};
