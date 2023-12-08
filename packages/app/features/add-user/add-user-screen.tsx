import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@nextui-org/react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { PageHeader } from "app/components/page-header";
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
			<PageHeader backHref="/users">Add user</PageHeader>
			<EmailVerificationCard />
			<UserNameInput form={form} isLoading={addUserMutation.isLoading} />
			<EmailInput form={form} isLoading={addUserMutation.isLoading} />
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
