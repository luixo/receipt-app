import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useRouter } from "solito/navigation";
import { z } from "zod";

import { PageHeader } from "~app/components/page-header";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import { noBatchContext } from "~app/utils/trpc";
import { emailSchema, passwordSchema } from "~app/utils/validation";
import { Button } from "~components/button";
import { Input } from "~components/input";
import { options as authLoginOptions } from "~mutations/auth/login";
import type { AppPage } from "~utils/next";

import { ResetPasswordModal } from "./reset-password-modal";

type LoginForm = {
	email: string;
	password: string;
};

export const LoginScreen: AppPage = () => {
	const router = useRouter();
	const queryClient = useQueryClient();
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
			onSuccess: () => {
				void queryClient.resetQueries();
				router.replace("/");
			},
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
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className="flex flex-col gap-4"
			>
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
					type="submit"
				>
					Login
				</Button>
			</form>
			<Button
				color="primary"
				isDisabled={loginMutation.isPending}
				onPress={openModal}
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
