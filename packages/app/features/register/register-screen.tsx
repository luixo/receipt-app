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
import { trpc } from "app/trpc";
import {
	accountNameSchema,
	passwordSchema,
	emailSchema,
} from "app/utils/validation";
import { AccountsId } from "next-app/db/models";

type RegistrationForm = {
	email: string;
	name: string;
	password: string;
	passwordRetype: string;
};

export const RegisterScreen: React.FC = () => {
	const router = useRouter();
	const form = useForm<RegistrationForm>({
		mode: "onChange",
		resolver: zodResolver(
			z.object({
				email: emailSchema,
				name: accountNameSchema,
				password: passwordSchema,
				passwordRetype: passwordSchema,
			})
		),
	});

	const trpcContext = trpc.useContext();

	const registerMutation = trpc.useMutation("auth.register");
	const onSubmit = useSubmitHandler(
		async (data: RegistrationForm) => {
			const result = await registerMutation.mutateAsync({
				email: data.email,
				name: data.name,
				password: data.password,
			});
			return {
				id: result.accountId,
				name: data.name,
			};
		},
		[registerMutation],
		React.useCallback(
			(account: { id: AccountsId; name: string }) => {
				cache.account.get.set(trpcContext, { ...account, publicName: null });
				router.replace("/");
			},
			[router, trpcContext]
		)
	);

	return (
		<Page>
			<Text h2>Register</Text>
			<Input
				{...form.register("email")}
				label="Email"
				helperColor="warning"
				helperText={form.formState.errors.email?.message}
			/>
			<Spacer y={1} />
			<Input
				{...form.register("name")}
				label="Name"
				placeholder="You can change it later"
				helperColor="warning"
				helperText={form.formState.errors.name?.message}
			/>
			<Spacer y={1} />
			<Input.Password
				{...form.register("password")}
				label="New password"
				helperColor="warning"
				helperText={form.formState.errors.password?.message}
			/>
			<Spacer y={1} />
			<Input.Password
				{...form.register("passwordRetype")}
				label="Retype new password"
				helperColor="warning"
				helperText={form.formState.errors.passwordRetype?.message}
			/>
			<Spacer y={1} />
			<Button
				disabled={!form.formState.isValid}
				onClick={form.handleSubmit(onSubmit)}
			>
				{registerMutation.isLoading ? <Loading /> : "Register"}
			</Button>
			{registerMutation.status === "error" ? (
				<>
					<Spacer y={1} />
					<MutationErrorMessage mutation={registerMutation} />
				</>
			) : null}
		</Page>
	);
};
