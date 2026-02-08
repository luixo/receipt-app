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
import { ChangePasswordScreen } from "~app/features/account/change-password";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { useAppForm } from "~app/utils/forms";
import { noBatchContext, useTRPC } from "~app/utils/trpc";
import { userNameSchema } from "~app/utils/validation";
import { Button } from "~components/button";
import { Icon } from "~components/icons";
import { SaveButton } from "~components/save-button";
import { SkeletonInput } from "~components/skeleton-input";
import { options as accountChangeNameOptions } from "~mutations/account/change-name";
import { options as accountLogoutOptions } from "~mutations/account/logout";

import { AccountAvatarInput } from "./account-avatar-input";

const AccountNameInput = suspendedFallback(
	() => {
		const { t } = useTranslation("account");
		const trpc = useTRPC();
		const {
			data: { account, user },
		} = useSuspenseQuery(trpc.account.get.queryOptions());
		const updateNameMutation = useMutation(
			trpc.account.changeName.mutationOptions(
				useTrpcMutationOptions(accountChangeNameOptions, {
					context: { id: account.id },
				}),
			),
		);
		const form = useAppForm({
			defaultValues: { value: user.name },
			validators: { onChange: z.object({ value: userNameSchema }) },
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
							user.name === field.state.value ? null : (
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
		const { t } = useTranslation("account");
		return <SkeletonInput label={t("form.name.label")} />;
	},
);

const AccountHeader: React.FC = suspendedFallback(
	() => {
		const trpc = useTRPC();
		const { data: account } = useSuspenseQuery(trpc.account.get.queryOptions());
		return (
			<PageHeader startContent={<Icon name="user" className="size-9" />}>
				{account.user.name}
			</PageHeader>
		);
	},
	<SkeletonPageHeader startContent={<Icon name="user" className="size-9" />} />,
);

export const AccountScreen = () => {
	const { t } = useTranslation("account");
	const trpc = useTRPC();
	const { useNavigate } = React.use(NavigationContext);
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const logoutMutation = useMutation(
		trpc.account.logout.mutationOptions(
			useTrpcMutationOptions(accountLogoutOptions, {
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
			<AccountHeader />
			<AccountAvatarInput>
				<AccountNameInput />
			</AccountAvatarInput>
			<ChangePasswordScreen />
			<Button
				className="mt-4 self-end"
				isDisabled={logoutMutation.isPending}
				onPress={logout}
				color="warning"
				isLoading={logoutMutation.isPending}
			>
				{t("logoutButton")}
			</Button>
		</>
	);
};
