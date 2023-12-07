import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Input, Loading, Spacer } from "@nextui-org/react";
import { Button } from "@nextui-org/react-tailwind";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Text } from "app/components/base/text";
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
			<>
				<Text className="text-2xl font-medium">Something went wrong</Text>
				<Text className="font-medium">
					Please verify you got reset link right or request a new one
				</Text>
			</>
		);
	}
	if (intentionQuery.status === "loading") {
		return <Loading />;
	}
	if (intentionQuery.status === "error") {
		return <QueryErrorMessage query={intentionQuery} />;
	}
	return (
		<>
			<Text className="text-2xl font-medium">{intentionQuery.data.email}</Text>
			<Input value={token} label="Token" disabled />
			<Spacer y={1} />
			<Input.Password
				{...form.register("password")}
				label="New password"
				helperColor="warning"
				helperText={form.formState.errors.password?.message}
				disabled={changePasswordMutation.isLoading}
			/>
			<Spacer y={1} />
			<Input.Password
				{...form.register("passwordRetype")}
				label="Retype new password"
				helperColor="warning"
				helperText={form.formState.errors.passwordRetype?.message}
				disabled={changePasswordMutation.isLoading}
			/>
			<Spacer y={1} />
			<Button
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
