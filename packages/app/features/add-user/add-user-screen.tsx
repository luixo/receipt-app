import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Loading, Spacer } from "@nextui-org/react";
import { useForm } from "react-hook-form";
import { useRouter } from "solito/router";
import { z } from "zod";

import { cache } from "app/cache";
import { MutationErrorMessage } from "app/components/error-message";
import { Header } from "app/components/header";
import { Page } from "app/components/page";
import { EmailVerificationCard } from "app/features/email-verification/email-verification-card";
import { useSubmitHandler } from "app/hooks/use-submit-handler";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc } from "app/trpc";
import { emailSchema, userNameSchema } from "app/utils/validation";
import { UsersId } from "next-app/src/db/models";

import { EmailInput } from "./email-input";
import { Form } from "./types";
import { UserNameInput } from "./user-name-input";

export const AddUserScreen: React.FC = () => {
	const router = useRouter();

	const addUserMutation = trpc.useMutation(
		"users.put",
		useTrpcMutationOptions(cache.users.put.mutationOptions)
	);

	const form = useForm<Form>({
		mode: "onChange",
		resolver: zodResolver(
			z.object({
				name: userNameSchema,
				email: emailSchema.optional().or(z.literal("")),
			})
		),
	});
	const onSubmit = useSubmitHandler<Form, UsersId>(
		async (values) => {
			const { id } = await addUserMutation.mutateAsync(values);
			return id;
		},
		[addUserMutation],
		React.useCallback((id: UsersId) => router.replace(`/users/${id}`), [router])
	);

	return (
		<Page>
			<Header>Add user</Header>
			<EmailVerificationCard />
			<Spacer y={1} />
			<UserNameInput form={form} query={addUserMutation} />
			<Spacer y={1} />
			<EmailInput form={form} query={addUserMutation} />
			<Spacer y={1} />
			<Button
				onClick={form.handleSubmit(onSubmit)}
				disabled={!form.formState.isValid || addUserMutation.isLoading}
			>
				{addUserMutation.isLoading ? <Loading size="sm" /> : "Add user"}
			</Button>
			{addUserMutation.status === "error" ? (
				<>
					<Spacer y={1} />
					<MutationErrorMessage mutation={addUserMutation} />
				</>
			) : null}
		</Page>
	);
};
