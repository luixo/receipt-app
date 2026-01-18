import React from "react";

import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { LoadableUser } from "~app/components/app/loadable-user";
import { PageHeader } from "~app/components/page-header";
import {
	RemoveButton,
	SkeletonRemoveButton,
} from "~app/components/remove-button";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { useAppForm } from "~app/utils/forms";
import { useTRPC } from "~app/utils/trpc";
import { userNameSchema } from "~app/utils/validation";
import { Button } from "~components/button";
import { Icon } from "~components/icons";
import { SkeletonInput } from "~components/input";
import { BackLink } from "~components/link";
import { SaveButton } from "~components/save-button";
import { View } from "~components/view";
import type { UserId } from "~db/ids";
import { options as usersRemoveOptions } from "~mutations/users/remove";
import { options as usersUpdateOptions } from "~mutations/users/update";

import { UserConnectionInput } from "./user-connection-input";

type NameProps = {
	id: UserId;
	isLoading: boolean;
};

const UserNameInput = suspendedFallback<NameProps>(
	({ isLoading, id }) => {
		const { t } = useTranslation("users");
		const trpc = useTRPC();
		const { data: user } = useSuspenseQuery(
			trpc.users.get.queryOptions({ id }),
		);
		const updateUserMutation = useMutation(
			trpc.users.update.mutationOptions(
				useTrpcMutationOptions(usersUpdateOptions),
			),
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
						label={t("user.name.label")}
						mutation={updateUserMutation}
						isDisabled={isLoading}
						endContent={
							user.name === field.state.value ? null : (
								<form.Subscribe selector={(state) => state.canSubmit}>
									{(canSubmit) => (
										<SaveButton
											title={t("user.name.save.title")}
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
	},
	() => {
		const { t } = useTranslation("users");
		return <SkeletonInput label={t("user.name.label")} />;
	},
);

type PublicNameProps = {
	id: UserId;
	isLoading: boolean;
};

const UserPublicNameInput = suspendedFallback<PublicNameProps>(
	({ isLoading, id }) => {
		const { t } = useTranslation("users");
		const trpc = useTRPC();
		const { data: user } = useSuspenseQuery(
			trpc.users.get.queryOptions({ id }),
		);
		const [showInput, { setTrue: setInput, setFalse: unsetInput }] =
			useBooleanState(user.publicName !== undefined);

		const updateUserMutation = useMutation(
			trpc.users.update.mutationOptions(
				useTrpcMutationOptions(usersUpdateOptions),
			),
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
					{t("user.publicName.add")}
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
						label={t("user.publicName.label")}
						mutation={updateUserMutation}
						isDisabled={isLoading}
						endContent={
							<View className="flex gap-2">
								{user.publicName === (field.state.value ?? undefined) ? null : (
									<form.Subscribe selector={(state) => state.canSubmit}>
										{(canSubmit) => (
											<SaveButton
												title={t("user.publicName.save.title")}
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
										title={t("user.publicName.remove.title")}
										variant="light"
										isLoading={updateUserMutation.isPending}
										onPress={() => {
											field.setValue(null);
											void field.form.handleSubmit();
										}}
										color="danger"
										isIconOnly
									>
										<Icon name="trash" className="size-6" />
									</Button>
								)}
							</View>
						}
					/>
				)}
			</form.AppField>
		);
	},
	() => {
		const { t } = useTranslation("users");
		return <SkeletonInput label={t("user.publicName.label")} />;
	},
);

type RemoveProps = {
	id: UserId;
	setLoading: (nextLoading: boolean) => void;
	onSuccess?: () => void;
} & Omit<
	React.ComponentProps<typeof RemoveButton>,
	"mutation" | "onRemove" | "subtitle"
>;

const UserRemoveButton = suspendedFallback<RemoveProps>(
	({ setLoading, onSuccess, id, ...props }) => {
		const { t } = useTranslation("users");
		const trpc = useTRPC();
		const { data: user } = useSuspenseQuery(
			trpc.users.get.queryOptions({ id }),
		);
		const removeUserMutation = useMutation(
			trpc.users.remove.mutationOptions(
				useTrpcMutationOptions(usersRemoveOptions, { onSuccess }),
			),
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
				subtitle={t("user.remove.subtitle")}
				{...props}
			/>
		);
	},
	({ className, children }) => (
		<SkeletonRemoveButton className={className}>
			{children}
		</SkeletonRemoveButton>
	),
);

export const User: React.FC<{ id: UserId; onRemove: () => void }> = ({
	id,
	onRemove,
}) => {
	const { t } = useTranslation("users");
	const [deleteLoading, setDeleteLoading] = React.useState(false);

	return (
		<>
			<PageHeader
				startContent={<BackLink to="/users" />}
				endContent={<LoadableUser id={id} />}
			/>
			<UserNameInput id={id} isLoading={deleteLoading} />
			<UserPublicNameInput id={id} isLoading={deleteLoading} />
			<UserConnectionInput id={id} isLoading={deleteLoading} />
			<UserRemoveButton
				id={id}
				className="self-end"
				setLoading={setDeleteLoading}
				onSuccess={onRemove}
			>
				{t("user.remove.button")}
			</UserRemoveButton>
		</>
	);
};
