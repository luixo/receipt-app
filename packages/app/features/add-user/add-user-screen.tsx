import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Loading, Spacer } from "@nextui-org/react";
import { useForm } from "react-hook-form";
import { useRouter } from "solito/router";
import { z } from "zod";

import { MutationErrorMessage } from "app/components/error-message";
import { Header } from "app/components/header";
import { EmailVerificationCard } from "app/features/email-verification/email-verification-card";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc } from "app/trpc";
import { emailSchema, userNameSchema } from "app/utils/validation";
import { PageWithLayout } from "next-app/types/page";

import { EmailInput } from "./email-input";
import { Form } from "./types";
import { UserNameInput } from "./user-name-input";

export const AddUserScreen: PageWithLayout = () => {
	const router = useRouter();

	const addUserMutation = trpc.users.add.useMutation(
		useTrpcMutationOptions(mutations.users.add.options, {
			onSuccess: ({ id }) => router.replace(`/users/${id}`),
		})
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
	const onSubmit = React.useCallback(
		(values: Form) => addUserMutation.mutate(values),
		[addUserMutation]
	);

	return (
		<>
			<Header backHref="/users">Add user</Header>
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
		</>
	);
};
