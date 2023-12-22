import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@nextui-org/react";
import { useForm } from "react-hook-form";
import { useRouter } from "solito/navigation";
import { z } from "zod";

import { Input } from "app/components/base/input";
import { PageHeader } from "app/components/page-header";
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
				fieldError={form.formState.errors.email}
				mutation={registerMutation}
			/>
			<Input
				{...form.register("name")}
				label="Name"
				placeholder="You can change it later"
				fieldError={form.formState.errors.name}
				isDisabled={registerMutation.isPending}
			/>
			<Input
				{...form.register("password")}
				label="New password"
				fieldError={form.formState.errors.password}
				isDisabled={registerMutation.isPending}
				type="password"
			/>
			<Input
				{...form.register("passwordRetype")}
				label="Retype new password"
				fieldError={form.formState.errors.passwordRetype}
				isDisabled={registerMutation.isPending}
				type="password"
			/>
			<Button
				className="mt-4"
				color="primary"
				isDisabled={!form.formState.isValid || registerMutation.isPending}
				isLoading={registerMutation.isPending}
				onClick={form.handleSubmit(onSubmit)}
				type="submit"
			>
				Register
			</Button>
		</>
	);
};
