import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Loading, Spacer } from "@nextui-org/react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Header } from "app/components/header";
import { useBooleanState } from "app/hooks/use-boolean-state";
import { useRouter } from "app/hooks/use-router";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc } from "app/trpc";
import { passwordSchema, emailSchema } from "app/utils/validation";
import { AppPage } from "next-app/types/page";

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
				helperColor="warning"
				helperText={form.formState.errors.email?.message}
				disabled={loginMutation.isLoading}
			/>
			<Spacer y={1} />
			<Input.Password
				{...form.register("password")}
				label="Password"
				helperColor="warning"
				helperText={form.formState.errors.password?.message}
				disabled={loginMutation.isLoading}
			/>
			<Spacer y={1} />
			<Button
				disabled={!form.formState.isValid || loginMutation.isLoading}
				onClick={form.handleSubmit(onSubmit)}
			>
				{loginMutation.isLoading ? <Loading /> : "Login"}
			</Button>
			<Spacer y={2} />
			<Button disabled={loginMutation.isLoading} onClick={openModal}>
				Forgot password?
			</Button>
			<ResetPasswordModal isModalOpen={modalOpen} closeModal={closeModal} />
		</>
	);
};
