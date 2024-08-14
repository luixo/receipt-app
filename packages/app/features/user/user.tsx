import React from "react";

import { useRouter } from "solito/navigation";

import { QueryErrorMessage } from "~app/components/error-message";
import { RemoveButton } from "~app/components/remove-button";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useSingleInput } from "~app/hooks/use-single-input";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput, TRPCQuerySuccessResult } from "~app/trpc";
import { trpc } from "~app/trpc";
import { userNameSchema } from "~app/utils/validation";
import { Button, Input, Spinner } from "~components";
import { TrashBin } from "~components/icons";
import type { UsersId } from "~db/models";
import { options as usersRemoveOptions } from "~mutations/users/remove";
import { options as usersUpdateOptions } from "~mutations/users/update";

import { UserConnectionInput } from "./user-connection-input";

type NameProps = {
	user: TRPCQueryOutput<"users.get">;
	isLoading: boolean;
};

const UserNameInput: React.FC<NameProps> = ({ user, isLoading }) => {
	const {
		bindings,
		state: inputState,
		getValue,
		setValue,
	} = useSingleInput({
		initialValue: user.name,
		schema: userNameSchema,
	});

	const updateUserMutation = trpc.users.update.useMutation(
		useTrpcMutationOptions(usersUpdateOptions),
	);
	const saveName = React.useCallback(
		(nextName: string) => {
			updateUserMutation.mutate(
				{ id: user.id, update: { type: "name", name: nextName } },
				{ onSuccess: () => setValue(nextName) },
			);
		},
		[updateUserMutation, user.id, setValue],
	);

	return (
		<Input
			{...bindings}
			label="User name"
			mutation={updateUserMutation}
			fieldError={inputState.error}
			isDisabled={isLoading}
			saveProps={{
				title: "Save user name",
				isHidden: user.name === getValue(),
				onClick: () => saveName(getValue()),
			}}
		/>
	);
};

type PublicNameProps = {
	user: TRPCQueryOutput<"users.get">;
	isLoading: boolean;
};

const UserPublicNameInput: React.FC<PublicNameProps> = ({
	user,
	isLoading,
}) => {
	const [showInput, { setTrue: setInput, setFalse: unsetInput }] =
		useBooleanState(user.publicName !== undefined);
	const {
		bindings,
		state: inputState,
		getValue,
		setValue,
	} = useSingleInput({
		initialValue: user.publicName ?? "",
		schema: userNameSchema,
	});

	const updateUserMutation = trpc.users.update.useMutation(
		useTrpcMutationOptions(usersUpdateOptions),
	);
	const savePublicName = React.useCallback(
		(nextName: string | undefined) => {
			if (nextName === undefined && user.publicName === undefined) {
				unsetInput();
				return;
			}
			updateUserMutation.mutate(
				{
					id: user.id,
					update: { type: "publicName", publicName: nextName },
				},
				{
					onSuccess: () => {
						setValue(nextName ?? "");
						if (nextName === undefined) {
							unsetInput();
						}
					},
				},
			);
		},
		[updateUserMutation, user.id, setValue, unsetInput, user.publicName],
	);

	if (!showInput) {
		return (
			<Button
				color="primary"
				isDisabled={updateUserMutation.isPending || isLoading}
				onClick={setInput}
			>
				Add public name
			</Button>
		);
	}

	return (
		<Input
			{...bindings}
			label="Public user name"
			mutation={updateUserMutation}
			fieldError={inputState.error}
			isDisabled={isLoading}
			saveProps={{
				title: "Save user public name",
				isHidden: user.publicName === getValue(),
				onClick: () => savePublicName(getValue()),
			}}
			endContent={
				user.publicName === undefined ? null : (
					<Button
						title="Remove user public name"
						variant="light"
						isLoading={updateUserMutation.isPending}
						onClick={() => savePublicName(undefined)}
						color="danger"
						isIconOnly
					>
						<TrashBin size={24} />
					</Button>
				)
			}
		/>
	);
};

type RemoveProps = {
	user: TRPCQueryOutput<"users.get">;
	setLoading: (nextLoading: boolean) => void;
} & Omit<
	React.ComponentProps<typeof RemoveButton>,
	"mutation" | "onRemove" | "subtitle"
>;

const UserRemoveButton: React.FC<RemoveProps> = ({
	user,
	setLoading,
	...props
}) => {
	const router = useRouter();
	const removeUserMutation = trpc.users.remove.useMutation(
		useTrpcMutationOptions(usersRemoveOptions, {
			onSuccess: () => router.replace("/users"),
		}),
	);
	React.useEffect(
		() => setLoading(removeUserMutation.isPending),
		[removeUserMutation.isPending, setLoading],
	);
	const removeUser = React.useCallback(
		() => removeUserMutation.mutate({ id: user.id }),
		[removeUserMutation, user.id],
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

type InnerProps = {
	query: TRPCQuerySuccessResult<"users.get">;
};

const UserInner: React.FC<InnerProps> = ({ query }) => {
	const user = query.data;
	const [deleteLoading, setDeleteLoading] = React.useState(false);
	return (
		<>
			<UserNameInput user={user} isLoading={deleteLoading} />
			<UserPublicNameInput user={user} isLoading={deleteLoading} />
			<UserConnectionInput user={user} isLoading={deleteLoading} />
			<UserRemoveButton
				className="self-end"
				user={user}
				setLoading={setDeleteLoading}
			/>
		</>
	);
};

type Props = Omit<InnerProps, "query"> & {
	id: UsersId;
};

export const User: React.FC<Props> = ({ id, ...props }) => {
	const query = trpc.users.get.useQuery({ id });
	if (query.status === "pending") {
		return <Spinner />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <UserInner {...props} query={query} />;
};
