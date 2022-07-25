import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Loading, Text, styled, Spacer } from "@nextui-org/react";
import { useForm } from "react-hook-form";
import { useRouter } from "solito/router";
import { z } from "zod";

import { cache } from "app/cache";
import { MutationErrorMessage } from "app/components/mutation-error-message";
import { Page } from "app/components/page";
import { QueryErrorMessage } from "app/components/query-error-message";
import { useSubmitHandler } from "app/hooks/use-submit-handler";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc } from "app/trpc";
import { emailSchema, userNameSchema } from "app/utils/validation";
import { UsersId } from "next-app/src/db/models";

import { EmailInput } from "./email-input";
import { Form } from "./types";
import { UserNameInput } from "./user-name-input";

const Header = styled(Text, {
	display: "flex",
	alignItems: "center",
});

export const AddUserScreen: React.FC = () => {
	const router = useRouter();
	const accountQuery = trpc.useQuery(["account.get"]);
	const usersGetPagedInput = cache.users.getPaged.useStore();
	const addUserMutation = trpc.useMutation(
		"users.put",
		useTrpcMutationOptions(cache.users.put.mutationOptions, {
			pagedInput: usersGetPagedInput,
			selfAccountId: accountQuery.data?.id ?? "unknown",
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
	const onSubmit = useSubmitHandler<Form, UsersId>(
		async (values) => {
			const { id } = await addUserMutation.mutateAsync(values);
			return id;
		},
		[addUserMutation, router],
		(id) => router.replace(`/users/${id}`)
	);

	return (
		<Page>
			<Header h2>Add user</Header>
			<Spacer y={1} />
			<UserNameInput form={form} query={addUserMutation} />
			<Spacer y={1} />
			<EmailInput form={form} query={addUserMutation} />
			<Spacer y={1} />
			<Button
				onClick={form.handleSubmit(onSubmit)}
				disabled={
					!form.formState.isValid ||
					addUserMutation.isLoading ||
					accountQuery.status !== "success"
				}
			>
				{addUserMutation.isLoading ? <Loading size="sm" /> : "Add user"}
			</Button>
			{addUserMutation.status === "error" ? (
				<>
					<Spacer y={1} />
					<MutationErrorMessage mutation={addUserMutation} />
				</>
			) : null}
			{accountQuery.status === "error" ? (
				<>
					<Spacer y={1} />
					<QueryErrorMessage query={accountQuery} />
				</>
			) : null}
		</Page>
	);
};
