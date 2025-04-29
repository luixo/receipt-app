import type React from "react";

import { z } from "zod";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import { useAppForm } from "~app/utils/forms";
import { passwordSchema } from "~app/utils/validation";
import { Button } from "~components/button";
import { options as accountChangePasswordOptions } from "~mutations/account/change-password";
import type { AppPage } from "~utils/next";

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
	const changePasswordMutation = trpc.account.changePassword.useMutation(
		useTrpcMutationOptions(accountChangePasswordOptions),
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
							label="Current password"
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
							label="New password"
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
							label="Retype new password"
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
							Change password
						</Button>
					)}
				</form.Subscribe>
			</form.Form>
		</form.AppForm>
	);
};

export const ChangePasswordScreen: AppPage = () => {
	const [changePasswordShown, { setTrue: showChangePassword }] =
		useBooleanState();

	if (!changePasswordShown) {
		return (
			<Button color="primary" onPress={showChangePassword}>
				Change password
			</Button>
		);
	}

	return <ChangePasswordForm />;
};
