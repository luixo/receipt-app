import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Loading, Spacer } from "@nextui-org/react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { MutationErrorMessage } from "app/components/error-message";
import { useBooleanState } from "app/hooks/use-boolean-state";
import { trpc } from "app/trpc";
import { passwordSchema } from "app/utils/validation";
import { PageWithLayout } from "next-app/types/page";

type Form = {
	prevPassword: string;
	password: string;
	passwordRetype: string;
};

export const ChangePasswordScreen: PageWithLayout = () => {
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
				})
		),
	});

	const changePasswordMutation = trpc.account.changePassword.useMutation();
	const onSubmit = React.useCallback(
		(data: Form) =>
			changePasswordMutation.mutate({
				prevPassword: data.prevPassword,
				password: data.password,
			}),
		[changePasswordMutation]
	);

	if (!changePasswordShown) {
		return <Button onClick={showChangePassword}>Change password</Button>;
	}

	return (
		<>
			<Input.Password
				{...form.register("prevPassword")}
				label="Current password"
				helperColor="warning"
				helperText={form.formState.errors.prevPassword?.message}
				disabled={changePasswordMutation.isLoading}
			/>
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
			<Spacer />
			<Button
				disabled={!form.formState.isValid || changePasswordMutation.isLoading}
				onClick={form.handleSubmit(onSubmit)}
			>
				{changePasswordMutation.isLoading ? <Loading /> : "Change password"}
			</Button>
			{changePasswordMutation.status === "error" ? (
				<MutationErrorMessage mutation={changePasswordMutation} />
			) : null}
		</>
	);
};
