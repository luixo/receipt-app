import React from "react";

import { Button, Input, Loading, Spacer } from "@nextui-org/react";
import { IoTrashBin as TrashBinIcon } from "react-icons/io5";
import { MdLink as LinkIcon, MdLinkOff as UnlinkIcon } from "react-icons/md";

import { IconButton } from "app/components/icon-button";
import { useInput } from "app/hooks/use-input";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { UsersGetInput } from "app/utils/queries/users-get";
import { usersGetPagedInputStore } from "app/utils/queries/users-get-paged";

import { cancelRequestMutationOptions } from "./cancel-request-mutation-options";
import { connectMutationOptions } from "./connect-mutation-options";
import { unlinkMutationOptions } from "./unlink-mutation-options";

type Props = {
	user: TRPCQueryOutput<"users.get">;
	input: UsersGetInput;
	isLoading: boolean;
};

export const UserConnectionInput: React.FC<Props> = ({
	user,
	input,
	isLoading,
}) => {
	const usersGetPagedInput = usersGetPagedInputStore();

	const connectionIntentionsQuery = trpc.useQuery([
		"account-connection-intentions.get-all",
	]);
	const outboundConnectionIntention =
		connectionIntentionsQuery.status === "success"
			? connectionIntentionsQuery.data.outbound.find(
					(element) => element.userId === user.id
			  ) ?? null
			: undefined;

	const connectUserMutation = trpc.useMutation(
		"account-connection-intentions.put",
		useTrpcMutationOptions(connectMutationOptions, {
			pagedInput: usersGetPagedInput,
			input,
		})
	);
	const connectUser = React.useCallback(
		(email: string) =>
			connectUserMutation.mutate({
				userId: user.id,
				email,
			}),
		[connectUserMutation, user.id]
	);

	const cancelRequestMutation = trpc.useMutation(
		"account-connection-intentions.cancel-request",
		useTrpcMutationOptions(cancelRequestMutationOptions)
	);
	const cancelRequest = React.useCallback(
		() => cancelRequestMutation.mutate({ userId: user.id }),
		[cancelRequestMutation, user.id]
	);

	const unlinkMutation = trpc.useMutation(
		"users.unlink",
		useTrpcMutationOptions(unlinkMutationOptions, {
			pagedInput: usersGetPagedInput,
			input,
		})
	);
	const unlinkUser = React.useCallback(
		() => unlinkMutation.mutate({ id: user.id }),
		[unlinkMutation, user.id]
	);

	const {
		bindings,
		state: inputState,
		value: inputValue,
	} = useInput({
		initialValue: user.email ?? undefined,
		rules: {
			pattern: {
				message: "Please enter valid email",
				value: /^\S+@\S+\.\S+$/,
			},
		},
	});

	const [inputShown, setInputShown] = React.useState(Boolean(user.email));

	if (outboundConnectionIntention === undefined) {
		return (
			<>
				<Spacer y={1} />
				{connectionIntentionsQuery.status === "loading" ? (
					<Loading />
				) : (
					<Button
						color="error"
						onClick={() => connectionIntentionsQuery.refetch()}
					>
						{connectionIntentionsQuery.error?.message}
					</Button>
				)}
			</>
		);
	}

	if (outboundConnectionIntention) {
		const mutationError = cancelRequestMutation.error?.message;
		return (
			<>
				<Spacer y={1} />
				<Input
					label="Outbound request"
					value={outboundConnectionIntention.email}
					disabled
					helperColor="error"
					helperText={mutationError}
					contentRightStyling={false}
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
			</>
		);
	}

	if (!inputShown) {
		return (
			<>
				<Spacer y={1} />
				<Button onClick={() => setInputShown(true)}>
					Connect to an account
				</Button>
			</>
		);
	}

	const mutationError =
		connectUserMutation.error?.message || unlinkMutation.error?.message;
	return (
		<>
			<Spacer y={1} />
			<Input
				{...bindings}
				label="Email"
				disabled={
					connectUserMutation.isLoading || isLoading || Boolean(user.email)
				}
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
								disabled={!inputValue || Boolean(inputState.error)}
								onClick={() => connectUser(inputValue)}
								icon={<LinkIcon size={24} />}
							/>
						)}
					</>
				}
			/>
		</>
	);
};
