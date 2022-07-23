import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "solito/router";
import { v4 } from "uuid";
import { z } from "zod";

import { cache, Cache } from "app/cache";
import { AddButton } from "app/components/add-button";
import { Block } from "app/components/block";
import { MutationWrapper } from "app/components/mutation-wrapper";
import { useSubmitHandler } from "app/hooks/use-submit-handler";
import {
	UseContextedMutationOptions,
	useTrpcMutationOptions,
} from "app/hooks/use-trpc-mutation-options";
import { trpc } from "app/trpc";
import { TextInput, Text } from "app/utils/styles";
import { userNameSchema } from "app/utils/validation";
import { AccountsId, UsersId } from "next-app/src/db/models";

const putMutationOptions: UseContextedMutationOptions<
	"users.put",
	UsersId,
	{
		pagedInput: Cache.Users.GetPaged.Input;
		selfAccountId: AccountsId;
	}
> = {
	onMutate:
		(trpcContext, { pagedInput }) =>
		(form) => {
			const temporaryId = v4();
			cache.users.getPaged.add(trpcContext, pagedInput, {
				id: temporaryId,
				name: form.name,
				publicName: form.publicName ?? null,
				email: null,
				dirty: false,
			});
			return temporaryId;
		},
	onError:
		(trpcContext, { pagedInput }) =>
		(_error, _variables, temporaryId) => {
			if (!temporaryId) {
				return;
			}
			cache.users.getPaged.remove(
				trpcContext,
				pagedInput,
				(user) => user.id === temporaryId
			);
		},
	onSuccess:
		(trpcContext, { pagedInput, selfAccountId }) =>
		(actualId, variables, temporaryId) => {
			cache.users.getPaged.update(
				trpcContext,
				pagedInput,
				temporaryId,
				(user) => ({
					...user,
					id: actualId,
					dirty: false,
				})
			);
			cache.users.get.add(
				trpcContext,
				{ id: actualId },
				{
					id: actualId,
					name: variables.name,
					publicName: variables.publicName ?? null,
					ownerAccountId: selfAccountId,
					email: null,
				}
			);
			cache.users.getName.add(trpcContext, { id: actualId }, variables.name);
		},
};

type Form = {
	name: string;
};

export const AddUserScreen: React.FC = () => {
	const router = useRouter();
	const accountQuery = trpc.useQuery(["account.get"]);
	const usersGetPagedInput = cache.users.getPaged.useStore();
	const addUserMutation = trpc.useMutation(
		"users.put",
		useTrpcMutationOptions(putMutationOptions, {
			pagedInput: usersGetPagedInput,
			selfAccountId: accountQuery.data?.id ?? "unknown",
		})
	);

	const {
		control,
		handleSubmit,
		formState: { isValid, isSubmitting, errors },
	} = useForm<Form>({
		mode: "onChange",
		resolver: zodResolver(z.object({ name: userNameSchema })),
	});
	const onSubmit = useSubmitHandler<Form, UsersId>(
		async (values) =>
			addUserMutation.mutateAsync({
				name: values.name,
			}),
		[addUserMutation, router],
		(id) => router.replace(`/users/${id}`)
	);

	return (
		<Block name="Add user">
			<Controller
				control={control}
				name="name"
				render={({ field: { onChange, value = "", onBlur } }) => (
					<>
						<TextInput
							placeholder="Enter user name"
							value={value}
							onBlur={onBlur}
							onChangeText={onChange}
							editable={!isSubmitting}
						/>
						{errors.name ? <Text>{errors.name.message}</Text> : null}
					</>
				)}
			/>
			<AddButton
				onPress={handleSubmit(onSubmit)}
				disabled={!isValid || accountQuery.status !== "success"}
			>
				Add
			</AddButton>
			<MutationWrapper<"users.put"> mutation={addUserMutation}>
				{() => <Text>Add success!</Text>}
			</MutationWrapper>
		</Block>
	);
};
