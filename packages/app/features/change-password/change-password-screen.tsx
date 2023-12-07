import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input } from "@nextui-org/react-tailwind";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useBooleanState } from "app/hooks/use-boolean-state";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc } from "app/trpc";
import { passwordSchema } from "app/utils/validation";
import type { AppPage } from "next-app/types/page";

type Form = {
	prevPassword: string;
	password: string;
	passwordRetype: string;
};

export const ChangePasswordScreen: AppPage = () => {
	const [changePasswordShown, { setTrue: showChangePassword }] =
		useBooleanState();

	const form = useForm<Form>({
		mode: "onChange",
		// TODO: open a PR in react-hook-form
		// After "password" change the "passwordRetype" doesn't get error
		// probably because the field "passwordRetype" didn't change
		resolver: zodResolver(
			z
				.object({
					prevPassword: passwordSchema,
					password: passwordSchema,
					passwordRetype: passwordSchema,
				})
				.refine((obj) => obj.password === obj.passwordRetype, {
					path: ["passwordRetype"],
					message: "Passwords don't match",
				}),
		),
	});

	const changePasswordMutation = trpc.account.changePassword.useMutation(
		useTrpcMutationOptions(mutations.account.changePassword.options),
	);
	const onSubmit = React.useCallback(
		(data: Form) =>
			changePasswordMutation.mutate({
				prevPassword: data.prevPassword,
				password: data.password,
			}),
		[changePasswordMutation],
	);

	if (!changePasswordShown) {
		return (
			<Button color="primary" onClick={showChangePassword}>
				Change password
			</Button>
		);
	}

	return (
		<>
			<Input
				{...form.register("prevPassword")}
				label="Current password"
				labelPlacement="outside"
				isDisabled={changePasswordMutation.isLoading}
				isInvalid={Boolean(form.formState.errors.prevPassword)}
				errorMessage={form.formState.errors.prevPassword?.message}
				type="password"
			/>
			<Input
				{...form.register("password")}
				label="New password"
				labelPlacement="outside"
				isDisabled={changePasswordMutation.isLoading}
				isInvalid={Boolean(form.formState.errors.password)}
				errorMessage={form.formState.errors.password?.message}
				type="password"
			/>
			<Input
				{...form.register("passwordRetype")}
				label="Retype new password"
				labelPlacement="outside"
				isDisabled={changePasswordMutation.isLoading}
				isInvalid={Boolean(form.formState.errors.passwordRetype)}
				errorMessage={form.formState.errors.passwordRetype?.message}
				type="password"
			/>
			<Button
				color="primary"
				isDisabled={!form.formState.isValid || changePasswordMutation.isLoading}
				isLoading={changePasswordMutation.isLoading}
				onClick={form.handleSubmit(onSubmit)}
			>
				Change password
			</Button>
		</>
	);
};
