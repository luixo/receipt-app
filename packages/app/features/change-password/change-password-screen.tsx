import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@nextui-org/react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { mutations } from "~app/mutations";
import { trpc } from "~app/trpc";
import { passwordSchema } from "~app/utils/validation";
import { Input } from "~components";
import type { AppPage } from "~web/types/page";

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
				isDisabled={changePasswordMutation.isPending}
				mutation={changePasswordMutation}
				fieldError={form.formState.errors.prevPassword}
				type="password"
			/>
			<Input
				{...form.register("password")}
				label="New password"
				isDisabled={changePasswordMutation.isPending}
				fieldError={form.formState.errors.password}
				type="password"
			/>
			<Input
				{...form.register("passwordRetype")}
				label="Retype new password"
				isDisabled={changePasswordMutation.isPending}
				fieldError={form.formState.errors.passwordRetype}
				type="password"
			/>
			<Button
				color="primary"
				isDisabled={!form.formState.isValid || changePasswordMutation.isPending}
				isLoading={changePasswordMutation.isPending}
				onClick={form.handleSubmit(onSubmit)}
			>
				Change password
			</Button>
		</>
	);
};
