import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Spinner } from "@nextui-org/react";
import { useForm } from "react-hook-form";
import { useRouter } from "solito/navigation";
import { z } from "zod";

import { Header } from "~app/components/base/header";
import { Input } from "~app/components/base/input";
import { EmptyCard } from "~app/components/empty-card";
import { QueryErrorMessage } from "~app/components/error-message";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { mutations } from "~app/mutations";
import type { TRPCQueryResult } from "~app/trpc";
import { trpc } from "~app/trpc";
import { passwordSchema } from "~app/utils/validation";

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
	if (intentionQuery.status === "pending") {
		return <Spinner size="lg" />;
	}
	if (intentionQuery.status === "error") {
		return <QueryErrorMessage query={intentionQuery} />;
	}
	return (
		<>
			<Header>{intentionQuery.data.email}</Header>
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
				isDisabled={!form.formState.isValid || changePasswordMutation.isPending}
				isLoading={changePasswordMutation.isPending}
				onClick={form.handleSubmit(onSubmit)}
			>
				Save password
			</Button>
		</>
	);
};
