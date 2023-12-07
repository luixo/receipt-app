import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Spacer } from "@nextui-org/react-tailwind";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Header } from "app/components/header";
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

	const [modalOpen, { setTrue: openModal, setFalse: closeModal }] =
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
			<Header>Login</Header>
			<Input
				{...form.register("email")}
				label="Email"
				labelPlacement="outside"
				isInvalid={Boolean(form.formState.errors.email)}
				errorMessage={form.formState.errors.email?.message}
				isDisabled={loginMutation.isLoading}
			/>
			<Spacer y={4} />
			<Input
				{...form.register("password")}
				label="Password"
				labelPlacement="outside"
				isInvalid={Boolean(form.formState.errors.password)}
				errorMessage={form.formState.errors.password?.message}
				isDisabled={loginMutation.isLoading}
				type="password"
			/>
			<Spacer y={4} />
			<Button
				color="primary"
				isDisabled={!form.formState.isValid || loginMutation.isLoading}
				isLoading={loginMutation.isLoading}
				onClick={form.handleSubmit(onSubmit)}
			>
				Login
			</Button>
			<Spacer y={8} />
			<Button
				color="primary"
				isDisabled={loginMutation.isLoading}
				onClick={openModal}
			>
				Forgot password?
			</Button>
			<ResetPasswordModal isModalOpen={modalOpen} closeModal={closeModal} />
		</>
	);
};
