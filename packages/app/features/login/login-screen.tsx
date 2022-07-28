import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Loading, Spacer, Text } from "@nextui-org/react";
import { useForm } from "react-hook-form";
import { useRouter } from "solito/router";
import { z } from "zod";

import { cache } from "app/cache";
import { MutationErrorMessage } from "app/components/mutation-error-message";
import { Page } from "app/components/page";
import { useSubmitHandler } from "app/hooks/use-submit-handler";
import { trpc, TRPCMutationOutput } from "app/trpc";
import { passwordSchema, emailSchema } from "app/utils/validation";

import { ResetPasswordModal } from "./reset-password-modal";

type LoginForm = {
	email: string;
	password: string;
};

export const LoginScreen: React.FC = () => {
	const router = useRouter();
	const form = useForm<LoginForm>({
		mode: "onChange",
		resolver: zodResolver(
			z.object({ email: emailSchema, password: passwordSchema })
		),
	});

	const [resetPasswordModalOpen, setResetPasswordModalOpen] =
		React.useState(false);
	const openResetPasswordModal = React.useCallback(
		() => setResetPasswordModalOpen(true),
		[setResetPasswordModalOpen]
	);
	const closeResetPasswordModal = React.useCallback(
		() => setResetPasswordModalOpen(false),
		[setResetPasswordModalOpen]
	);

	const trpcContext = trpc.useContext();
	const loginMutation = trpc.useMutation("auth.login");
	const onSubmit = useSubmitHandler(
		(data: LoginForm) => loginMutation.mutateAsync(data),
		[loginMutation, trpcContext],
		React.useCallback(
			({ accountId, ...account }: TRPCMutationOutput<"auth.login">) => {
				cache.account.get.set(trpcContext, { id: accountId, ...account });
				router.replace("/");
			},
			[router, trpcContext]
		)
	);

	return (
		<Page>
			<Text h2>Login</Text>
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
			<Button
				disabled={loginMutation.isLoading}
				onClick={openResetPasswordModal}
			>
				Forgot password?
			</Button>
			<ResetPasswordModal
				isModalOpen={resetPasswordModalOpen}
				closeModal={closeResetPasswordModal}
			/>
		</Page>
	);
};
