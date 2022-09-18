import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Loading, Spacer } from "@nextui-org/react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { MutationErrorMessage } from "app/components/error-message";
import { Header } from "app/components/header";
import { useRouter } from "app/hooks/use-router";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc } from "app/trpc";
import {
	passwordSchema,
	emailSchema,
	userNameSchema,
} from "app/utils/validation";
import { AppPage } from "next-app/types/page";

type RegistrationForm = {
	email: string;
	name: string;
	password: string;
	passwordRetype: string;
};

export const RegisterScreen: AppPage = () => {
	const router = useRouter();
	const form = useForm<RegistrationForm>({
		mode: "onChange",
		resolver: zodResolver(
			z.object({
				email: emailSchema,
				name: userNameSchema,
				password: passwordSchema,
				passwordRetype: passwordSchema,
			})
		),
	});

	const registerMutation = trpc.auth.register.useMutation(
		useTrpcMutationOptions(mutations.auth.register.options, {
			context: {
				name: form.watch("name"),
			},
			onSuccess: () => router.replace("/"),
		})
	);
	const onSubmit = React.useCallback(
		(data: RegistrationForm) =>
			registerMutation.mutate({
				email: data.email,
				name: data.name,
				password: data.password,
			}),
		[registerMutation]
	);

	return (
		<>
			<Header>Register</Header>
			<Input
				{...form.register("email")}
				label="Email"
				helperColor="warning"
				helperText={form.formState.errors.email?.message}
				disabled={registerMutation.isLoading}
			/>
			<Spacer y={1} />
			<Input
				{...form.register("name")}
				label="Name"
				placeholder="You can change it later"
				helperColor="warning"
				helperText={form.formState.errors.name?.message}
				disabled={registerMutation.isLoading}
			/>
			<Spacer y={1} />
			<Input.Password
				{...form.register("password")}
				label="New password"
				helperColor="warning"
				helperText={form.formState.errors.password?.message}
				disabled={registerMutation.isLoading}
			/>
			<Spacer y={1} />
			<Input.Password
				{...form.register("passwordRetype")}
				label="Retype new password"
				helperColor="warning"
				helperText={form.formState.errors.passwordRetype?.message}
				disabled={registerMutation.isLoading}
			/>
			<Spacer y={1} />
			<Button
				disabled={!form.formState.isValid || registerMutation.isLoading}
				onClick={form.handleSubmit(onSubmit)}
			>
				{registerMutation.isLoading ? <Loading /> : "Register"}
			</Button>
			{registerMutation.status === "error" ? (
				<>
					<Spacer y={1} />
					<MutationErrorMessage mutation={registerMutation} />
				</>
			) : null}
		</>
	);
};
