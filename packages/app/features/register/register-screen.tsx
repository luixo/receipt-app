import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input } from "@nextui-org/react-tailwind";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { PageHeader } from "app/components/page-header";
import { useRouter } from "app/hooks/use-router";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc } from "app/trpc";
import {
	emailSchema,
	passwordSchema,
	userNameSchema,
} from "app/utils/validation";
import type { AppPage } from "next-app/types/page";

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
			}),
		),
	});

	const registerMutation = trpc.auth.register.useMutation(
		useTrpcMutationOptions(mutations.auth.register.options, {
			context: {
				name: form.watch("name"),
			},
			onSuccess: () => router.replace("/"),
		}),
	);
	const onSubmit = React.useCallback(
		(data: RegistrationForm) =>
			registerMutation.mutate({
				email: data.email,
				name: data.name,
				password: data.password,
			}),
		[registerMutation],
	);

	return (
		<>
			<PageHeader>Register</PageHeader>
			<Input
				{...form.register("email")}
				label="Email"
				labelPlacement="outside"
				isInvalid={Boolean(form.formState.errors.email)}
				errorMessage={form.formState.errors.email?.message}
				isDisabled={registerMutation.isLoading}
			/>
			<Input
				{...form.register("name")}
				label="Name"
				labelPlacement="outside"
				placeholder="You can change it later"
				isInvalid={Boolean(form.formState.errors.name)}
				errorMessage={form.formState.errors.name?.message}
				isDisabled={registerMutation.isLoading}
			/>
			<Input
				{...form.register("password")}
				label="New password"
				labelPlacement="outside"
				isInvalid={Boolean(form.formState.errors.password)}
				errorMessage={form.formState.errors.password?.message}
				isDisabled={registerMutation.isLoading}
				type="password"
			/>
			<Input
				{...form.register("passwordRetype")}
				label="Retype new password"
				labelPlacement="outside"
				isInvalid={Boolean(form.formState.errors.passwordRetype)}
				errorMessage={form.formState.errors.passwordRetype?.message}
				isDisabled={registerMutation.isLoading}
				type="password"
			/>
			<Button
				className="mt-4"
				color="primary"
				isDisabled={!form.formState.isValid || registerMutation.isLoading}
				isLoading={registerMutation.isLoading}
				onClick={form.handleSubmit(onSubmit)}
				type="submit"
			>
				Register
			</Button>
		</>
	);
};
