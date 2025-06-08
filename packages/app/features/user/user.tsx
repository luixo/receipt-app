import React from "react";
import { View } from "react-native";

import { z } from "zod/v4";

import { QueryErrorMessage } from "~app/components/error-message";
import { RemoveButton } from "~app/components/remove-button";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput, TRPCQuerySuccessResult } from "~app/trpc";
import { trpc } from "~app/trpc";
import { useAppForm } from "~app/utils/forms";
import { userNameSchema } from "~app/utils/validation";
import { Button } from "~components/button";
import { TrashBin } from "~components/icons";
import { SaveButton } from "~components/save-button";
import { Spinner } from "~components/spinner";
import type { UsersId } from "~db/models";
import { options as usersRemoveOptions } from "~mutations/users/remove";
import { options as usersUpdateOptions } from "~mutations/users/update";

import { UserConnectionInput } from "./user-connection-input";

type NameProps = {
	user: TRPCQueryOutput<"users.get">;
	isLoading: boolean;
};

const UserNameInput: React.FC<NameProps> = ({ user, isLoading }) => {
	const updateUserMutation = trpc.users.update.useMutation(
		useTrpcMutationOptions(usersUpdateOptions),
	);
	const form = useAppForm({
		defaultValues: { value: user.name },
		validators: { onChange: z.object({ value: userNameSchema }) },
		onSubmit: ({ value }) => {
			updateUserMutation.mutate({
				id: user.id,
				update: { type: "name", name: value.value },
			});
		},
	});

	return (
		<form.AppField name="value">
			{(field) => (
				<field.TextField
					value={field.state.value}
					onValueChange={field.setValue}
					name={field.name}
					onBlur={field.handleBlur}
					fieldError={
						field.state.meta.isDirty ? field.state.meta.errors : undefined
					}
					label="User name"
					mutation={updateUserMutation}
					isDisabled={isLoading}
					endContent={
						user.name === field.state.value ? null : (
							<form.Subscribe selector={(state) => state.canSubmit}>
								{(canSubmit) => (
									<SaveButton
										title="Save user name"
										onPress={() => {
											void field.form.handleSubmit();
										}}
										isLoading={updateUserMutation.isPending}
										isDisabled={isLoading || !canSubmit}
									/>
								)}
							</form.Subscribe>
						)
					}
				/>
			)}
		</form.AppField>
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

	const updateUserMutation = trpc.users.update.useMutation(
		useTrpcMutationOptions(usersUpdateOptions),
	);
	const form = useAppForm({
		defaultValues: { value: user.publicName ?? null },
		validators: {
			onChange: z.object({ value: userNameSchema.or(z.null()) }),
		},
		onSubmit: ({ value }) => {
			if (value.value === null && user.publicName === undefined) {
				unsetInput();
				return;
			}
			updateUserMutation.mutate({
				id: user.id,
				update: { type: "publicName", publicName: value.value ?? undefined },
			});
		},
	});

	if (!showInput) {
		return (
			<Button
				color="primary"
				isDisabled={updateUserMutation.isPending || isLoading}
				onPress={setInput}
			>
				Add public name
			</Button>
		);
	}

	return (
		<form.AppField name="value">
			{(field) => (
				<field.TextField
					value={field.state.value ?? ""}
					onValueChange={field.setValue}
					name={field.name}
					onBlur={field.handleBlur}
					fieldError={
						field.state.meta.isDirty ? field.state.meta.errors : undefined
					}
					label="Public user name"
					mutation={updateUserMutation}
					isDisabled={isLoading}
					endContent={
						<View className="flex gap-2">
							{user.publicName === (field.state.value ?? undefined) ? null : (
								<form.Subscribe selector={(state) => state.canSubmit}>
									{(canSubmit) => (
										<SaveButton
											title="Save user public name"
											onPress={() => {
												void field.form.handleSubmit();
											}}
											isLoading={updateUserMutation.isPending}
											isDisabled={isLoading || !canSubmit}
										/>
									)}
								</form.Subscribe>
							)}
							{user.publicName === undefined ? null : (
								<Button
									title="Remove user public name"
									variant="light"
									isLoading={updateUserMutation.isPending}
									onPress={() => {
										field.setValue(null);
										void field.form.handleSubmit();
									}}
									color="danger"
									isIconOnly
								>
									<TrashBin size={24} />
								</Button>
							)}
						</View>
					}
				/>
			)}
		</form.AppField>
	);
};

type RemoveProps = {
	user: TRPCQueryOutput<"users.get">;
	setLoading: (nextLoading: boolean) => void;
	onSuccess?: () => void;
} & Omit<
	React.ComponentProps<typeof RemoveButton>,
	"mutation" | "onRemove" | "subtitle"
>;

const UserRemoveButton: React.FC<RemoveProps> = ({
	user,
	setLoading,
	onSuccess,
	...props
}) => {
	const removeUserMutation = trpc.users.remove.useMutation(
		useTrpcMutationOptions(usersRemoveOptions, { onSuccess }),
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
	onRemove?: () => void;
};

const UserInner: React.FC<InnerProps> = ({ query, onRemove }) => {
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
				onSuccess={onRemove}
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
