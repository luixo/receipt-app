import React from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { PageHeader } from "~app/components/page-header";
import { NavigationContext } from "~app/contexts/navigation-context";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { useAppForm } from "~app/utils/forms";
import { noBatchContext, useTRPC } from "~app/utils/trpc";
import { emailSchema, passwordSchema } from "~app/utils/validation";
import { Button } from "~components/button";
import { Input } from "~components/input";
import { options as authLoginOptions } from "~mutations/auth/login";

import { ResetPasswordModal } from "./reset-password-modal";

const formSchema = z.object({ email: emailSchema, password: passwordSchema });
type Form = z.infer<typeof formSchema>;

export const LoginScreen: React.FC<{ redirectUrl: string }> = ({
	redirectUrl,
}) => {
	const { t } = useTranslation("login");
	const trpc = useTRPC();
	const { usePush } = React.use(NavigationContext);
	const push = usePush();
	const queryClient = useQueryClient();

	const [modalOpen, { switchValue: switchModalOpen, setTrue: openModal }] =
		useBooleanState();

	const loginMutation = useMutation(
		trpc.auth.login.mutationOptions(
			useTrpcMutationOptions(authLoginOptions, {
				onSuccess: () => {
					void queryClient.resetQueries();
					push(redirectUrl);
				},
				trpc: { context: noBatchContext },
			}),
		),
	);

	const defaultValues: Partial<Form> = {};
	const form = useAppForm({
		defaultValues: defaultValues as Form,
		validators: {
			onMount: formSchema,
			onChange: formSchema,
			onSubmit: formSchema,
		},
		onSubmit: ({ value }) => loginMutation.mutate(value),
	});

	return (
		<>
			<PageHeader>{t("header")}</PageHeader>
			<form.AppForm>
				<form.Form className="flex flex-col gap-4">
					<form.AppField name="email">
						{(field) => (
							<Input
								value={field.state.value}
								onValueChange={field.setValue}
								label={t("form.email.label")}
								fieldError={
									field.state.meta.isDirty ? field.state.meta.errors : undefined
								}
								mutation={loginMutation}
							/>
						)}
					</form.AppField>
					<form.AppField name="password">
						{(field) => (
							<Input
								value={field.state.value}
								onValueChange={field.setValue}
								label={t("form.password.label")}
								fieldError={
									field.state.meta.isDirty ? field.state.meta.errors : undefined
								}
								mutation={loginMutation}
								type="password"
							/>
						)}
					</form.AppField>

					<form.Subscribe selector={(state) => state.canSubmit}>
						{(canSubmit) => (
							<Button
								className="mt-4"
								color="primary"
								isDisabled={!canSubmit || loginMutation.isPending}
								isLoading={loginMutation.isPending}
								type="submit"
							>
								{t("form.submit")}
							</Button>
						)}
					</form.Subscribe>
				</form.Form>
			</form.AppForm>
			<Button
				color="primary"
				isDisabled={loginMutation.isPending}
				onPress={openModal}
			>
				{t("forgotPassword.button")}
			</Button>
			<ResetPasswordModal
				isModalOpen={modalOpen}
				switchModalOpen={switchModalOpen}
			/>
		</>
	);
};
