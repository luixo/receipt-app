import React from "react";

import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { PageHeader, SkeletonPageHeader } from "~app/components/page-header";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { NavigationContext } from "~app/contexts/navigation-context";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import { ChangePasswordScreen } from "~app/features/user/change-password";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { useAppForm } from "~app/utils/forms";
import { noBatchContext, useTRPC } from "~app/utils/trpc";
import { peerNameSchema } from "~app/utils/validation";
import { Button } from "~components/button";
import { Icon } from "~components/icons";
import { SaveButton } from "~components/save-button";
import { SkeletonInput } from "~components/skeleton-input";
import { View } from "~components/view";
import { options as userChangeNameOptions } from "~mutations/user/change-name";
import { options as userLogoutOptions } from "~mutations/user/logout";

import { UserAvatarInput } from "./user-avatar-input";

const UserNameInput = suspendedFallback(
	() => {
		const { t } = useTranslation("user");
		const trpc = useTRPC();
		const {
			data: { user, peer },
		} = useSuspenseQuery(trpc.user.get.queryOptions());
		const updateNameMutation = useMutation(
			trpc.user.changeName.mutationOptions(
				useTrpcMutationOptions(userChangeNameOptions, {
					context: { id: user.id },
				}),
			),
		);
		const form = useAppForm({
			defaultValues: { value: peer.name },
			validators: { onChange: z.object({ value: peerNameSchema }) },
			onSubmit: ({ value }) => updateNameMutation.mutate({ name: value.value }),
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
						label={t("form.name.label")}
						mutation={updateNameMutation}
						endContent={
							peer.name === field.state.value ? null : (
								<form.Subscribe selector={(state) => state.canSubmit}>
									{(canSubmit) => (
										<SaveButton
											title={t("form.name.saveButton")}
											onPress={() => {
												void field.form.handleSubmit();
											}}
											isLoading={updateNameMutation.isPending}
											isDisabled={!canSubmit}
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
		const { t } = useTranslation("user");
		return <SkeletonInput label={t("form.name.label")} />;
	},
);

const UserHeader: React.FC = suspendedFallback(
	() => {
		const trpc = useTRPC();
		const { data: user } = useSuspenseQuery(trpc.user.get.queryOptions());
		return (
			<PageHeader startContent={<Icon name="user" className="size-9" />}>
				{user.peer.name}
			</PageHeader>
		);
	},
	<SkeletonPageHeader startContent={<Icon name="user" className="size-9" />} />,
);

export const UserScreen = () => {
	const { t } = useTranslation("user");
	const trpc = useTRPC();
	const { useNavigate } = React.use(NavigationContext);
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const logoutMutation = useMutation(
		trpc.user.logout.mutationOptions(
			useTrpcMutationOptions(userLogoutOptions, {
				onSuccess: () => {
					void queryClient.resetQueries();
					navigate({ to: "/", replace: true });
				},
				trpc: { context: noBatchContext },
			}),
		),
	);
	const logout = React.useCallback(
		() => logoutMutation.mutate(),
		[logoutMutation],
	);
	return (
		<>
			<EmailVerificationCard />
			<UserHeader />
			<UserAvatarInput>
				<UserNameInput />
			</UserAvatarInput>
			<ChangePasswordScreen />
			<View className="flex items-end pt-4">
				<Button
					isDisabled={logoutMutation.isPending}
					onPress={logout}
					color="warning"
					isLoading={logoutMutation.isPending}
				>
					{t("logoutButton")}
				</Button>
			</View>
		</>
	);
};
