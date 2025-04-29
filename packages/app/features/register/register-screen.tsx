import React from "react";

import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { PageHeader } from "~app/components/page-header";
import { useNavigate } from "~app/hooks/use-navigation";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import { useAppForm } from "~app/utils/forms";
import { noBatchContext } from "~app/utils/trpc";
import {
	emailSchema,
	passwordSchema,
	userNameSchema,
} from "~app/utils/validation";
import { Button } from "~components/button";
import { options as authRegisterOptions } from "~mutations/auth/register";
import type { AppPage } from "~utils/next";

const formSchema = z.object({
	email: emailSchema,
	name: userNameSchema,
	password: passwordSchema,
	passwordRetype: passwordSchema,
});
type Form = z.infer<typeof formSchema>;

export const RegisterScreen: AppPage = () => {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const registerMutation = trpc.auth.register.useMutation(
		useTrpcMutationOptions(authRegisterOptions, {
			onSuccess: () => {
				void queryClient.resetQueries();
				navigate("/", { replace: true });
			},
			trpc: { context: noBatchContext },
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
		onSubmit: ({ value: { passwordRetype, ...value } }) =>
			registerMutation.mutate(value),
	});

	return (
		<>
			<PageHeader>Register</PageHeader>
			<form.AppForm>
				<form.Form className="flex flex-col gap-4">
					<form.AppField name="email">
						{(field) => (
							<field.TextField
								value={field.state.value}
								onValueChange={field.setValue}
								name={field.name}
								onBlur={field.handleBlur}
								label="Email"
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
								label="Name"
								placeholder="You can change it later"
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
								label="New password"
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
								label="Retype new password"
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
								Register
							</Button>
						)}
					</form.Subscribe>
				</form.Form>
			</form.AppForm>
		</>
	);
};
