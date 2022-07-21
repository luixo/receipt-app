import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { v4 } from "uuid";
import { z } from "zod";

import { AddButton } from "app/components/add-button";
import { Block } from "app/components/block";
import { MutationWrapper } from "app/components/mutation-wrapper";
import { useSubmitHandler } from "app/hooks/use-submit-handler";
import {
	UseContextedMutationOptions,
	useTrpcMutationOptions,
} from "app/hooks/use-trpc-mutation-options";
import { trpc } from "app/trpc";
import {
	updatePagedUsers,
	UsersGetPagedInput,
	usersGetPagedInputStore,
} from "app/utils/queries/users-get-paged";
import { TextInput, Text } from "app/utils/styles";
import { userNameSchema } from "app/utils/validation";
import { UsersId } from "next-app/src/db/models";

const putMutationOptions: UseContextedMutationOptions<
	"users.put",
	UsersId,
	UsersGetPagedInput
> = {
	onMutate: (trpcContext, input) => (form) => {
		const temporaryId = v4();
		updatePagedUsers(trpcContext, input, (page, index) => {
			if (index === 0) {
				return [
					{
						id: temporaryId,
						name: form.name,
						publicName: null,
						dirty: true,
						email: null,
					},
					...page,
				];
			}
			return page;
		});
		return temporaryId;
	},
	onError: (trpcContext, input) => (_error, _variables, temporaryId) => {
		if (!temporaryId) {
			return;
		}
		updatePagedUsers(trpcContext, input, (page) =>
			page.filter((user) => user.id !== temporaryId)
		);
	},
	onSuccess: (trpcContext, input) => (actualId, _variables, temporaryId) => {
		if (!temporaryId) {
			return;
		}
		updatePagedUsers(trpcContext, input, (page) =>
			page.map((user) =>
				user.id === temporaryId ? { ...user, id: actualId, dirty: false } : user
			)
		);
	},
};

type Form = {
	name: string;
};

export const AddUserScreen: React.FC = () => {
	const usersGetPagedInput = usersGetPagedInputStore();
	const addUserMutation = trpc.useMutation(
		"users.put",
		useTrpcMutationOptions(putMutationOptions, usersGetPagedInput)
	);

	const {
		control,
		handleSubmit,
		formState: { isValid, isSubmitting, errors },
		reset,
	} = useForm<Form>({
		mode: "onChange",
		resolver: zodResolver(z.object({ name: userNameSchema })),
	});
	const onSubmit = useSubmitHandler<Form>(
		(values) => addUserMutation.mutateAsync({ name: values.name }),
		[addUserMutation, reset],
		reset
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
			<AddButton onPress={handleSubmit(onSubmit)} disabled={!isValid}>
				Add
			</AddButton>
			<MutationWrapper<"users.put"> mutation={addUserMutation}>
				{() => <Text>Add success!</Text>}
			</MutationWrapper>
		</Block>
	);
};
