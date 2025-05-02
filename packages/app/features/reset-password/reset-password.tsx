import type React from "react";

import { z } from "zod";

import { QueryErrorMessage } from "~app/components/error-message";
import { useNavigate } from "~app/hooks/use-navigation";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import { useAppForm } from "~app/utils/forms";
import { passwordSchema } from "~app/utils/validation";
import { Button } from "~components/button";
import { Header } from "~components/header";
import { Input } from "~components/input";
import { Spinner } from "~components/spinner";
import { options as authResetPasswordOptions } from "~mutations/auth/reset-password";

const formSchema = z.object({
	password: passwordSchema,
	passwordRetype: passwordSchema,
});
type Form = z.infer<typeof formSchema>;

type Props = {
	token: string;
};

const ResetPasswordForm: React.FC<Props> = ({ token }) => {
	const navigate = useNavigate();

	const changePasswordMutation = trpc.auth.resetPassword.useMutation(
		useTrpcMutationOptions(authResetPasswordOptions, {
			onSuccess: () => navigate({ to: "/login", replace: true }),
		}),
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
			changePasswordMutation.mutate({ password: value.password, token });
		},
	});

	return (
		<form.AppForm>
			<form.Form className="flex flex-col gap-4">
				<Input value={token} label="Token" isReadOnly />
				<form.AppField name="password">
					{(field) => (
						<field.TextField
							value={field.state.value}
							onValueChange={field.setValue}
							name={field.name}
							onBlur={field.handleBlur}
							label="New password"
							type="password"
							fieldError={
								field.state.meta.isDirty ? field.state.meta.errors : undefined
							}
							mutation={changePasswordMutation}
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
							type="password"
							fieldError={
								field.state.meta.isDirty ? field.state.meta.errors : undefined
							}
							mutation={changePasswordMutation}
						/>
					)}
				</form.AppField>
				<form.Subscribe selector={(state) => state.canSubmit}>
					{(canSubmit) => (
						<Button
							className="mt-4"
							color="primary"
							isDisabled={!canSubmit || changePasswordMutation.isPending}
							isLoading={changePasswordMutation.isPending}
							type="submit"
						>
							Save password
						</Button>
					)}
				</form.Subscribe>
			</form.Form>
		</form.AppForm>
	);
};

export const ResetPassword: React.FC<Props> = ({ token }) => {
	const intentionQuery = trpc.resetPasswordIntentions.get.useQuery({ token });

	switch (intentionQuery.status) {
		case "pending":
			return <Spinner size="lg" />;
		case "error":
			return <QueryErrorMessage query={intentionQuery} />;
		case "success":
			return (
				<>
					<Header>{intentionQuery.data.email}</Header>
					<ResetPasswordForm token={token} />
				</>
			);
	}
};
