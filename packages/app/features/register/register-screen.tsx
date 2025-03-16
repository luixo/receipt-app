import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useRouter } from "solito/navigation";
import { z } from "zod";

import { PageHeader } from "~app/components/page-header";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import { noBatchContext } from "~app/utils/trpc";
import {
	emailSchema,
	passwordSchema,
	userNameSchema,
} from "~app/utils/validation";
import { Button } from "~components/button";
import { Input } from "~components/input";
import { options as authRegisterOptions } from "~mutations/auth/register";
import type { AppPage } from "~utils/next";

type RegistrationForm = {
	email: string;
	name: string;
	password: string;
	passwordRetype: string;
};

export const RegisterScreen: AppPage = () => {
	const router = useRouter();
	const queryClient = useQueryClient();
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
		useTrpcMutationOptions(authRegisterOptions, {
			context: {
				name: form.watch("name"),
			},
			onSuccess: () => {
				void queryClient.resetQueries();
				router.replace("/");
			},
			trpc: { context: noBatchContext },
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
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className="flex flex-col gap-4"
			>
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
					type="submit"
				>
					Register
				</Button>
			</form>
		</>
	);
};
