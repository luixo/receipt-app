import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Loading, Spacer } from "@nextui-org/react";
import { useForm } from "react-hook-form";
import { useRouter } from "solito/router";
import { z } from "zod";

import { MutationErrorMessage } from "app/components/error-message";
import { Header } from "app/components/header";
import { useBooleanState } from "app/hooks/use-boolean-state";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc } from "app/trpc";
import { passwordSchema, emailSchema } from "app/utils/validation";
import { PageWithLayout } from "next-app/types/page";

import { ResetPasswordModal } from "./reset-password-modal";

type LoginForm = {
	email: string;
	password: string;
};

export const LoginScreen: PageWithLayout = () => {
	const router = useRouter();
	const form = useForm<LoginForm>({
		mode: "onChange",
		resolver: zodResolver(
			z.object({ email: emailSchema, password: passwordSchema })
		),
	});

	const [modalOpen, { setTrue: openModal, setFalse: closeModal }] =
		useBooleanState();

	const loginMutation = trpc.auth.login.useMutation(
		useTrpcMutationOptions(mutations.auth.login.options)
	);
	const onSubmit = React.useCallback(
		(data: LoginForm) => loginMutation.mutate(data),
		[loginMutation]
	);
	React.useEffect(() => {
		if (loginMutation.status === "success") {
			router.replace("/");
		}
	}, [loginMutation, router]);

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
			{loginMutation.status === "error" ? (
				<>
					<Spacer y={1} />
					<MutationErrorMessage mutation={loginMutation} />
				</>
			) : null}
			<Spacer y={2} />
			<Button disabled={loginMutation.isLoading} onClick={openModal}>
				Forgot password?
			</Button>
			<ResetPasswordModal isModalOpen={modalOpen} closeModal={closeModal} />
		</>
	);
};
