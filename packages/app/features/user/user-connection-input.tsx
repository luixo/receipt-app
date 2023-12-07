import React from "react";

import { Loading } from "@nextui-org/react";
import { Button, Input } from "@nextui-org/react-tailwind";
import { IoTrashBin as TrashBinIcon } from "react-icons/io5";
import { MdLink as LinkIcon, MdLinkOff as UnlinkIcon } from "react-icons/md";

import { useSingleInput } from "app/hooks/use-single-input";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";
import { emailSchema } from "app/utils/validation";
import type { AccountsId } from "next-app/db/models";

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
					(element) => element.user.id === user.remoteId,
			  ) ?? null
			: undefined;

	const connectUserMutation = trpc.accountConnectionIntentions.add.useMutation(
		useTrpcMutationOptions(mutations.users.connect.options),
	);
	const connectUser = React.useCallback(
		(email: string) =>
			connectUserMutation.mutate({
				userId: user.remoteId,
				email,
			}),
		[connectUserMutation, user.remoteId],
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

	const cancelRequestMutation =
		trpc.accountConnectionIntentions.remove.useMutation(
			useTrpcMutationOptions(mutations.accountConnections.remove.options, {
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
		useTrpcMutationOptions(mutations.users.unlink.options),
	);
	const unlinkUser = React.useCallback(
		() => unlinkMutation.mutate({ id: user.remoteId }),
		[unlinkMutation, user.remoteId],
	);

	if (outboundConnectionIntention === undefined) {
		if (connectionIntentionsQuery.status === "loading") {
			return <Loading />;
		}
		if (connectionIntentionsQuery.status === "error") {
			return (
				<Button
					color="danger"
					onClick={() => connectionIntentionsQuery.refetch()}
				>
					{connectionIntentionsQuery.error?.message}
				</Button>
			);
		}
		return null;
	}

	if (outboundConnectionIntention) {
		const mutationError = cancelRequestMutation.error?.message;
		return (
			<Input
				label="Outbound request"
				labelPlacement="outside"
				value={outboundConnectionIntention.account.email}
				isReadOnly
				isInvalid={Boolean(mutationError)}
				errorMessage={mutationError}
				endContent={
					<Button
						title="Cancel request"
						variant="light"
						isLoading={cancelRequestMutation.isLoading}
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

	const mutationError =
		connectUserMutation.error?.message || unlinkMutation.error?.message;
	return (
		<Input
			{...bindings}
			label="Email"
			labelPlacement="outside"
			isDisabled={connectUserMutation.isLoading || isLoading}
			isReadOnly={Boolean(user.email)}
			isInvalid={Boolean(inputState.error || mutationError)}
			errorMessage={inputState.error?.message || mutationError}
			endContent={
				<>
					{user.email ? (
						<Button
							title="Unlink user from email"
							variant="light"
							isLoading={unlinkMutation.isLoading}
							isIconOnly
							onClick={unlinkUser}
						>
							<UnlinkIcon size={24} />
						</Button>
					) : (
						<Button
							title="Link user to email"
							variant="light"
							isLoading={connectUserMutation.isLoading}
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
