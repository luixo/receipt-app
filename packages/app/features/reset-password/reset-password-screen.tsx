import React from "react";

import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { EmptyCard } from "~app/components/empty-card";
import { ErrorMessage } from "~app/components/error-message";
import { PageHeader } from "~app/components/page-header";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { NavigationContext } from "~app/contexts/navigation-context";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { useAppForm } from "~app/utils/forms";
import { useTRPC } from "~app/utils/trpc";
import { passwordSchema } from "~app/utils/validation";
import { Button } from "~components/button";
import { Input } from "~components/input";
import { Skeleton } from "~components/skeleton";
import { Text } from "~components/text";
import { options as authResetPasswordOptions } from "~mutations/auth/reset-password";

const formSchema = z
	.object({
		password: passwordSchema,
		passwordRetype: passwordSchema,
	})
	.refine((obj) => obj.password === obj.passwordRetype, {
		path: ["passwordRetype"],
		message: "Passwords don't match",
	});
type Form = z.infer<typeof formSchema>;

const ResetPasswordHeader = suspendedFallback<{ token: string }>(
	({ token }) => {
		const trpc = useTRPC();
		const { data: intention } = useSuspenseQuery(
			trpc.resetPasswordIntentions.get.queryOptions({ token }),
		);
		return <Text variant="h3">{intention.email}</Text>;
	},
	<Skeleton className="h-8 w-60 rounded" />,
);

type Props = {
	token: string;
};

const ResetPassword: React.FC<Props> = ({ token }) => {
	const { t } = useTranslation("reset-password");
	const trpc = useTRPC();
	const { useNavigate } = React.use(NavigationContext);
	const navigate = useNavigate();

	const changePasswordMutation = useMutation(
		trpc.auth.resetPassword.mutationOptions(
			useTrpcMutationOptions(authResetPasswordOptions, {
				onSuccess: () => navigate({ to: "/login", replace: true }),
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
		onSubmit: ({ value }) => {
			changePasswordMutation.mutate({ password: value.password, token });
		},
	});

	return (
		<>
			<ResetPasswordHeader token={token} />
			<form.AppForm>
				<form.Form className="flex flex-col gap-4">
					<Input
						value={token}
						label={t("form.token.label")}
						isDisabled
						className="hidden"
						autoComplete="username"
					/>
					<form.AppField name="password">
						{(field) => (
							<field.TextField
								value={field.state.value}
								onValueChange={field.setValue}
								name={field.name}
								onBlur={field.handleBlur}
								label={t("form.password.label")}
								type="password"
								autoComplete="new-password"
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
								label={t("form.passwordRetype.label")}
								type="password"
								autoComplete="new-password"
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
								{t("form.submit")}
							</Button>
						)}
					</form.Subscribe>
					{changePasswordMutation.status === "error" ? (
						<ErrorMessage message={changePasswordMutation.error.message} />
					) : null}
				</form.Form>
			</form.AppForm>
		</>
	);
};

export const ResetPasswordScreen: React.FC<{
	token: string;
}> = ({ token }) => {
	const { t } = useTranslation("reset-password");
	return (
		<>
			<PageHeader>{t("header")}</PageHeader>
			{token ? (
				<ResetPassword token={token} />
			) : (
				<EmptyCard title={t("noToken.title")}>
					<Text variant="h3" className="text-center">
						{t("noToken.message")}
					</Text>
				</EmptyCard>
			)}
		</>
	);
};
