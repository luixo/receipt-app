import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Spacer } from "@nextui-org/react-tailwind";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Header } from "app/components/header";
import { EmailVerificationCard } from "app/features/email-verification/email-verification-card";
import { useRouter } from "app/hooks/use-router";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc } from "app/trpc";
import { emailSchema, userNameSchema } from "app/utils/validation";
import type { AppPage } from "next-app/types/page";

import { EmailInput } from "./email-input";
import type { Form } from "./types";
import { UserNameInput } from "./user-name-input";

export const AddUserScreen: AppPage = () => {
	const router = useRouter();

	const addUserMutation = trpc.users.add.useMutation(
		useTrpcMutationOptions(mutations.users.add.options, {
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
			<Header backHref="/users">Add user</Header>
			<EmailVerificationCard />
			<Spacer y={4} />
			<UserNameInput form={form} query={addUserMutation} />
			<Spacer y={4} />
			<EmailInput form={form} query={addUserMutation} />
			<Spacer y={4} />
			<Button
				color="primary"
				onClick={form.handleSubmit(onSubmit)}
				isDisabled={!form.formState.isValid || addUserMutation.isLoading}
				isLoading={addUserMutation.isLoading}
			>
				Add user
			</Button>
		</>
	);
};
