import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Spinner } from "@nextui-org/react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Header } from "app/components/base/header";
import { EmptyCard } from "app/components/empty-card";
import { QueryErrorMessage } from "app/components/error-message";
import { useRouter } from "app/hooks/use-router";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCQueryResult } from "app/trpc";
import { trpc } from "app/trpc";
import { passwordSchema } from "app/utils/validation";

type ChangePasswordForm = {
	password: string;
	passwordRetype: string;
};

type Props = {
	token?: string;
	intentionQuery: TRPCQueryResult<"resetPasswordIntentions.get">;
};

export const ResetPassword: React.FC<Props> = ({ token, intentionQuery }) => {
	const router = useRouter();
	const form = useForm<ChangePasswordForm>({
		mode: "onChange",
		resolver: zodResolver(
			z.object({ password: passwordSchema, passwordRetype: passwordSchema }),
		),
	});

	const changePasswordMutation = trpc.auth.resetPassword.useMutation(
		useTrpcMutationOptions(mutations.auth.resetPassword.options, {
			onSuccess: () => router.replace("/login"),
		}),
	);
	const onSubmit = React.useCallback(
		({ password }: ChangePasswordForm) => {
			if (!token) {
				return;
			}
			changePasswordMutation.mutate({ password, token });
		},
		[changePasswordMutation, token],
	);

	if (!token) {
		return (
			<EmptyCard title="Something went wrong">
				Please verify you got reset link right or request a new one
			</EmptyCard>
		);
	}
	if (intentionQuery.status === "loading") {
		return <Spinner size="lg" />;
	}
	if (intentionQuery.status === "error") {
		return <QueryErrorMessage query={intentionQuery} />;
	}
	return (
		<>
			<Header>{intentionQuery.data.email}</Header>
			<Input value={token} label="Token" labelPlacement="outside" isReadOnly />
			<Input
				{...form.register("password")}
				label="New password"
				labelPlacement="outside"
				isInvalid={Boolean(form.formState.errors.password)}
				errorMessage={form.formState.errors.password?.message}
				disabled={changePasswordMutation.isLoading}
				type="password"
			/>
			<Input
				{...form.register("passwordRetype")}
				label="Retype new password"
				labelPlacement="outside"
				isInvalid={Boolean(form.formState.errors.passwordRetype)}
				errorMessage={form.formState.errors.passwordRetype?.message}
				disabled={changePasswordMutation.isLoading}
				type="password"
			/>
			<Button
				className="mt-4"
				color="primary"
				isDisabled={!form.formState.isValid || changePasswordMutation.isLoading}
				isLoading={changePasswordMutation.isLoading}
				onClick={form.handleSubmit(onSubmit)}
			>
				Save password
			</Button>
		</>
	);
};
