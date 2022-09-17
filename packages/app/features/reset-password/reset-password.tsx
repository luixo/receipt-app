import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Loading, Spacer, Text } from "@nextui-org/react";
import { useForm } from "react-hook-form";
import { useRouter } from "solito/router";
import { z } from "zod";

import {
	MutationErrorMessage,
	QueryErrorMessage,
} from "app/components/error-message";
import { trpc, TRPCQueryResult } from "app/trpc";
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
			z.object({ password: passwordSchema, passwordRetype: passwordSchema })
		),
	});

	const changePasswordMutation = trpc.auth.resetPassword.useMutation({
		onSuccess: () => router.replace("/login"),
	});
	const onSubmit = React.useCallback(
		({ password }: ChangePasswordForm) => {
			if (!token) {
				return;
			}
			changePasswordMutation.mutate({ password, token });
		},
		[changePasswordMutation, token]
	);

	if (!token) {
		return (
			<>
				<Text h3>Something went wrong</Text>
				<Text b>
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
			<Text h3>{intentionQuery.data.email}</Text>
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
				disabled={!form.formState.isValid || changePasswordMutation.isLoading}
				onClick={form.handleSubmit(onSubmit)}
			>
				{changePasswordMutation.isLoading ? <Loading /> : "Save password"}
			</Button>
			{changePasswordMutation.status === "error" ? (
				<>
					<Spacer y={1} />
					<MutationErrorMessage mutation={changePasswordMutation} />
				</>
			) : null}
		</>
	);
};
