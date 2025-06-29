import type React from "react";

import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod/v4";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { useAppForm } from "~app/utils/forms";
import { useTRPC } from "~app/utils/trpc";
import { passwordSchema } from "~app/utils/validation";
import { Button } from "~components/button";
import { options as accountChangePasswordOptions } from "~mutations/account/change-password";

const formSchema = z
	.object({
		prevPassword: passwordSchema,
		password: passwordSchema,
		passwordRetype: passwordSchema,
	})
	.refine((obj) => obj.password === obj.passwordRetype, {
		path: ["passwordRetype"],
		message: "Passwords don't match",
	});

type Form = z.infer<typeof formSchema>;

const ChangePasswordForm: React.FC = () => {
	const { t } = useTranslation("account");
	const trpc = useTRPC();
	const changePasswordMutation = useMutation(
		trpc.account.changePassword.mutationOptions(
			useTrpcMutationOptions(accountChangePasswordOptions),
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
		onSubmit: ({ value }) => {
			changePasswordMutation.mutate({
				prevPassword: value.prevPassword,
				password: value.password,
			});
		},
	});

	return (
		<form.AppForm>
			<form.Form className="flex flex-col gap-4">
				<form.AppField name="prevPassword">
					{(field) => (
						<field.TextField
							value={field.state.value}
							onValueChange={field.setValue}
							name={field.name}
							onBlur={field.handleBlur}
							label={t("changePassword.prevPassword.label")}
							mutation={changePasswordMutation}
							fieldError={
								field.state.meta.isDirty ? field.state.meta.errors : undefined
							}
							type="password"
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
							label={t("changePassword.password.label")}
							mutation={changePasswordMutation}
							fieldError={
								field.state.meta.isDirty ? field.state.meta.errors : undefined
							}
							type="password"
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
							label={t("changePassword.retypePassword.label")}
							mutation={changePasswordMutation}
							fieldError={
								field.state.meta.isDirty ? field.state.meta.errors : undefined
							}
							type="password"
						/>
					)}
				</form.AppField>
				<form.Subscribe selector={(state) => state.canSubmit}>
					{(canSubmit) => (
						<Button
							color="primary"
							isDisabled={!canSubmit || changePasswordMutation.isPending}
							isLoading={changePasswordMutation.isPending}
							type="submit"
						>
							{t("changePassword.submitButton")}
						</Button>
					)}
				</form.Subscribe>
			</form.Form>
		</form.AppForm>
	);
};

export const ChangePasswordScreen: React.FC = () => {
	const { t } = useTranslation("account");
	const [changePasswordShown, { setTrue: showChangePassword }] =
		useBooleanState();

	if (!changePasswordShown) {
		return (
			<Button color="primary" onPress={showChangePassword}>
				{t("changePassword.showFormButton")}
			</Button>
		);
	}

	return <ChangePasswordForm />;
};
