import type React from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { omit } from "remeda";
import { z } from "zod/v4";

import { PageHeader } from "~app/components/page-header";
import { useNavigate } from "~app/hooks/use-navigation";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { useAppForm } from "~app/utils/forms";
import { noBatchContext, useTRPC } from "~app/utils/trpc";
import {
	emailSchema,
	passwordSchema,
	userNameSchema,
} from "~app/utils/validation";
import { Button } from "~components/button";
import { options as authRegisterOptions } from "~mutations/auth/register";

const formSchema = z.object({
	email: emailSchema,
	name: userNameSchema,
	password: passwordSchema,
	passwordRetype: passwordSchema,
});
type Form = z.infer<typeof formSchema>;

export const RegisterScreen: React.FC = () => {
	const { t } = useTranslation("register");
	const trpc = useTRPC();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const registerMutation = useMutation(
		trpc.auth.register.mutationOptions(
			useTrpcMutationOptions(authRegisterOptions, {
				onSuccess: () => {
					void queryClient.resetQueries();
					navigate({ to: "/", replace: true });
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
		onSubmit: ({ value }) =>
			registerMutation.mutate(omit(value, ["passwordRetype"])),
	});

	return (
		<>
			<PageHeader>{t("header")}</PageHeader>
			<form.AppForm>
				<form.Form className="flex flex-col gap-4">
					<form.AppField name="email">
						{(field) => (
							<field.TextField
								value={field.state.value}
								onValueChange={field.setValue}
								name={field.name}
								onBlur={field.handleBlur}
								label={t("form.email.label")}
								fieldError={
									field.state.meta.isDirty ? field.state.meta.errors : undefined
								}
								mutation={registerMutation}
							/>
						)}
					</form.AppField>
					<form.AppField name="name">
						{(field) => (
							<field.TextField
								value={field.state.value}
								onValueChange={field.setValue}
								name={field.name}
								onBlur={field.handleBlur}
								label={t("form.name.label")}
								placeholder={t("form.name.placeholder")}
								fieldError={
									field.state.meta.isDirty ? field.state.meta.errors : undefined
								}
								mutation={registerMutation}
							/>
						)}
					</form.AppField>
					<form.AppField name="password">
						{(field) => (
							<field.TextField
								value={field.state.value}
								onValueChange={field.setValue}
								name={field.name}
								onBlur={field.handleBlur}
								label={t("form.password.label")}
								type="password"
								fieldError={
									field.state.meta.isDirty ? field.state.meta.errors : undefined
								}
								mutation={registerMutation}
							/>
						)}
					</form.AppField>
					<form.AppField name="passwordRetype">
						{(field) => (
							<field.TextField
								value={field.state.value}
								onValueChange={field.setValue}
								name={field.name}
								onBlur={field.handleBlur}
								label={t("form.passwordRetype.label")}
								type="password"
								fieldError={
									field.state.meta.isDirty ? field.state.meta.errors : undefined
								}
								mutation={registerMutation}
							/>
						)}
					</form.AppField>
					<form.Subscribe selector={(state) => state.canSubmit}>
						{(canSubmit) => (
							<Button
								className="mt-4"
								color="primary"
								isDisabled={!canSubmit || registerMutation.isPending}
								isLoading={registerMutation.isPending}
								type="submit"
							>
								{t("form.submit")}
							</Button>
						)}
					</form.Subscribe>
				</form.Form>
			</form.AppForm>
		</>
	);
};
