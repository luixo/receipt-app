import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input } from "@nextui-org/react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { PageHeader } from "app/components/page-header";
import { useBooleanState } from "app/hooks/use-boolean-state";
import { useRouter } from "app/hooks/use-router";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc } from "app/trpc";
import { emailSchema, passwordSchema } from "app/utils/validation";
import type { AppPage } from "next-app/types/page";

import { ResetPasswordModal } from "./reset-password-modal";

type LoginForm = {
	email: string;
	password: string;
};

export const LoginScreen: AppPage = () => {
	const router = useRouter();
	const form = useForm<LoginForm>({
		mode: "onChange",
		resolver: zodResolver(
			z.object({ email: emailSchema, password: passwordSchema }),
		),
	});

	const [modalOpen, { switchValue: switchModalOpen, setTrue: openModal }] =
		useBooleanState();

	const loginMutation = trpc.auth.login.useMutation(
		useTrpcMutationOptions(mutations.auth.login.options, {
			onSuccess: () => router.replace("/"),
		}),
	);
	const onSubmit = React.useCallback(
		(data: LoginForm) => loginMutation.mutate(data),
		[loginMutation],
	);

	return (
		<>
			<PageHeader>Login</PageHeader>
			<Input
				{...form.register("email")}
				label="Email"
				labelPlacement="outside"
				isInvalid={Boolean(form.formState.errors.email)}
				errorMessage={form.formState.errors.email?.message}
				isDisabled={loginMutation.isLoading}
			/>
			<Input
				{...form.register("password")}
				label="Password"
				labelPlacement="outside"
				isInvalid={Boolean(form.formState.errors.password)}
				errorMessage={form.formState.errors.password?.message}
				isDisabled={loginMutation.isLoading}
				type="password"
			/>
			<Button
				className="mt-4"
				color="primary"
				isDisabled={!form.formState.isValid || loginMutation.isLoading}
				isLoading={loginMutation.isLoading}
				onClick={form.handleSubmit(onSubmit)}
			>
				Login
			</Button>
			<Button
				color="primary"
				isDisabled={loginMutation.isLoading}
				onClick={openModal}
			>
				Forgot password?
			</Button>
			<ResetPasswordModal
				isModalOpen={modalOpen}
				switchModalOpen={switchModalOpen}
			/>
		</>
	);
};
