import React from "react";

import { UsersId } from "next-app/src/db/models";
import { useForm, Controller } from "react-hook-form";
import { v4 } from "uuid";

import { useSubmitHandler } from "../hooks/use-submit-handler";
import {
	UseContextedMutationOptions,
	useTrpcMutationOptions,
} from "../hooks/use-trpc-mutation-options";
import { trpc } from "../trpc";
import {
	updatePagedUsers,
	UsersGetPagedInput,
} from "../utils/queries/users-get-paged";
import { TextInput, Text } from "../utils/styles";
import { VALIDATIONS_CONSTANTS } from "../utils/validation";

import { AddButton } from "./utils/add-button";
import { Block } from "./utils/block";
import { MutationWrapper } from "./utils/mutation-wrapper";

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
						publicName: form.name,
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

type Props = {
	input: UsersGetPagedInput;
};

export const AddUserForm: React.FC<Props> = ({ input }) => {
	const addUserMutation = trpc.useMutation(
		"users.put",
		useTrpcMutationOptions(putMutationOptions, input)
	);

	const {
		control,
		handleSubmit,
		formState: { isValid, isSubmitting, errors },
		reset,
	} = useForm<Form>({ mode: "onChange" });
	const onSubmit = useSubmitHandler<Form>(
		(values) =>
			addUserMutation.mutateAsync({
				name: values.name,
				publicName: values.name,
			}),
		[addUserMutation, reset],
		reset
	);

	return (
		<Block name="Add user">
			<Controller
				control={control}
				name="name"
				rules={{
					required: true,
					minLength: VALIDATIONS_CONSTANTS.userName.min,
					maxLength: VALIDATIONS_CONSTANTS.userName.max,
				}}
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
