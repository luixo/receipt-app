import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { useRouter } from "solito/navigation";
import { z } from "zod";

import { PageHeader } from "~app/components/page-header";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import { useInputController } from "~app/hooks/use-input-controller";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import { emailSchema, userNameSchema } from "~app/utils/validation";
import { Button } from "~components/button";
import { Input } from "~components/input";
import { options as usersAddOptions } from "~mutations/users/add";
import type { AppPage } from "~utils/next";

type EmailProps = {
	form: UseFormReturn<Form>;
	isLoading: boolean;
};

const EmailInput: React.FC<EmailProps> = ({ form, isLoading }) => {
	const { bindings, state: inputState } = useInputController({
		name: "email",
		form,
	});

	return (
		<Input
			{...bindings}
			label="Email"
			isDisabled={isLoading}
			fieldError={inputState.error}
		/>
	);
};

type NameProps = {
	form: UseFormReturn<Form>;
	isLoading: boolean;
};

const UserNameInput: React.FC<NameProps> = ({ form, isLoading }) => {
	const { bindings, state: inputState } = useInputController({
		name: "name",
		form,
	});

	return (
		<Input
			{...bindings}
			required
			label="User name"
			isDisabled={isLoading}
			fieldError={inputState.error}
		/>
	);
};

type Form = {
	name: string;
	email?: string;
};

export const AddUserScreen: AppPage = () => {
	const router = useRouter();

	const addUserMutation = trpc.users.add.useMutation(
		useTrpcMutationOptions(usersAddOptions, {
			onSuccess: ({ id }) => router.replace(`/users/${id}`),
		}),
	);

	const form = useForm<Form>({
		mode: "onChange",
		resolver: zodResolver(
			z.object({
				name: userNameSchema,
				email: emailSchema.optional().or(z.literal("")),
			}),
		),
	});
	const onSubmit = React.useCallback(
		(values: Form) => addUserMutation.mutate(values),
		[addUserMutation],
	);

	return (
		<>
			<PageHeader backHref="/users">Add user</PageHeader>
			<EmailVerificationCard />
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className="flex flex-col gap-4"
			>
				<UserNameInput form={form} isLoading={addUserMutation.isPending} />
				<EmailInput form={form} isLoading={addUserMutation.isPending} />
				<Button
					color="primary"
					isDisabled={!form.formState.isValid || addUserMutation.isPending}
					isLoading={addUserMutation.isPending}
					type="submit"
				>
					Add user
				</Button>
			</form>
		</>
	);
};
