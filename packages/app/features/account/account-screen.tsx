import React from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { QueryErrorMessage } from "~app/components/error-message";
import { PageHeader } from "~app/components/page-header";
import { ChangePasswordScreen } from "~app/features/account/change-password";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import { useNavigate } from "~app/hooks/use-navigation";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput, TRPCQuerySuccessResult } from "~app/trpc";
import { useAppForm } from "~app/utils/forms";
import { noBatchContext, useTRPC } from "~app/utils/trpc";
import { userNameSchema } from "~app/utils/validation";
import { Button } from "~components/button";
import { AccountIcon } from "~components/icons";
import { SaveButton } from "~components/save-button";
import { Spinner } from "~components/spinner";
import { options as accountChangeNameOptions } from "~mutations/account/change-name";
import { options as accountLogoutOptions } from "~mutations/account/logout";

import { AccountAvatarInput } from "./account-avatar-input";

type NameProps = {
	accountQuery: TRPCQueryOutput<"account.get">;
};

const AccountNameInput: React.FC<NameProps> = ({ accountQuery }) => {
	const { t } = useTranslation("account");
	const trpc = useTRPC();
	const updateNameMutation = useMutation(
		trpc.account.changeName.mutationOptions(
			useTrpcMutationOptions(accountChangeNameOptions, {
				context: { id: accountQuery.account.id },
			}),
		),
	);
	const form = useAppForm({
		defaultValues: { value: accountQuery.user.name },
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
						accountQuery.user.name === field.state.value ? null : (
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
};

const AccountHeader: React.FC<{ name: string }> = ({ name }) => (
	<PageHeader startContent={<AccountIcon size={36} />}>{name}</PageHeader>
);

type InnerProps = {
	query: TRPCQuerySuccessResult<"account.get">;
};

const AccountScreenInner: React.FC<InnerProps> = ({ query }) => {
	const { t } = useTranslation("account");
	const trpc = useTRPC();
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
			<AccountHeader name={query.data.user.name} />
			<AccountAvatarInput account={query.data.account}>
				<AccountNameInput accountQuery={query.data} />
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

const AccountScreenQuery: React.FC = () => {
	const { t } = useTranslation("account");
	const trpc = useTRPC();
	const query = useQuery(trpc.account.get.queryOptions());
	switch (query.status) {
		case "pending":
			return (
				<>
					<AccountHeader name={t("loadingAccount")} />
					<Spinner />
				</>
			);
		case "error":
			return <QueryErrorMessage query={query} />;
		case "success":
			return <AccountScreenInner query={query} />;
	}
};

export const AccountScreen: React.FC = () => (
	<>
		<EmailVerificationCard />
		<AccountScreenQuery />
	</>
);
