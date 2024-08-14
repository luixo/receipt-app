import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "solito/navigation";
import { z } from "zod";

import { PageHeader } from "~app/components/page-header";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import { noBatchContext } from "~app/utils/trpc";
import { emailSchema, passwordSchema } from "~app/utils/validation";
import { Button, Input } from "~components";
import { options as authLoginOptions } from "~mutations/auth/login";
import type { AppPage } from "~utils/next";

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
		useTrpcMutationOptions(authLoginOptions, {
			onSuccess: () => router.replace("/"),
			trpc: { context: noBatchContext },
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
				fieldError={form.formState.errors.email}
				isDisabled={loginMutation.isPending}
			/>
			<Input
				{...form.register("password")}
				label="Password"
				fieldError={form.formState.errors.password}
				isDisabled={loginMutation.isPending}
				type="password"
			/>
			<Button
				className="mt-4"
				color="primary"
				isDisabled={!form.formState.isValid || loginMutation.isPending}
				isLoading={loginMutation.isPending}
				onClick={form.handleSubmit(onSubmit)}
			>
				Login
			</Button>
			<Button
				color="primary"
				isDisabled={loginMutation.isPending}
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
