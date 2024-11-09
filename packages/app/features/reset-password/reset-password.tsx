import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "solito/navigation";
import { z } from "zod";

import { QueryErrorMessage } from "~app/components/error-message";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import { passwordSchema } from "~app/utils/validation";
import { Button } from "~components/button";
import { Header } from "~components/header";
import { Input } from "~components/input";
import { Spinner } from "~components/spinner";
import { options as authResetPasswordOptions } from "~mutations/auth/reset-password";

type ChangePasswordForm = {
	password: string;
	passwordRetype: string;
};

type Props = {
	token: string;
};

export const ResetPassword: React.FC<Props> = ({ token }) => {
	const router = useRouter();
	const intentionQuery = trpc.resetPasswordIntentions.get.useQuery({ token });
	const form = useForm<ChangePasswordForm>({
		mode: "onChange",
		resolver: zodResolver(
			z.object({ password: passwordSchema, passwordRetype: passwordSchema }),
		),
	});

	const changePasswordMutation = trpc.auth.resetPassword.useMutation(
		useTrpcMutationOptions(authResetPasswordOptions, {
			onSuccess: () => router.replace("/login"),
		}),
	);
	const onSubmit = React.useCallback(
		({ password }: ChangePasswordForm) =>
			changePasswordMutation.mutate({ password, token }),
		[changePasswordMutation, token],
	);

	if (intentionQuery.status === "pending") {
		return <Spinner size="lg" />;
	}
	if (intentionQuery.status === "error") {
		return <QueryErrorMessage query={intentionQuery} />;
	}
	return (
		<>
			<Header>{intentionQuery.data.email}</Header>
			<form
				className="flex flex-col gap-4"
				onSubmit={form.handleSubmit(onSubmit)}
			>
				<Input value={token} label="Token" isReadOnly />
				<Input
					{...form.register("password")}
					label="New password"
					fieldError={form.formState.errors.password}
					disabled={changePasswordMutation.isPending}
					type="password"
				/>
				<Input
					{...form.register("passwordRetype")}
					label="Retype new password"
					fieldError={form.formState.errors.passwordRetype}
					disabled={changePasswordMutation.isPending}
					type="password"
				/>
				<Button
					className="mt-4"
					color="primary"
					isDisabled={
						!form.formState.isValid || changePasswordMutation.isPending
					}
					isLoading={changePasswordMutation.isPending}
					type="submit"
				>
					Save password
				</Button>
			</form>
		</>
	);
};
