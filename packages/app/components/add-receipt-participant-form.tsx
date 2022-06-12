import React from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { UsersId } from "next-app/db/models";
import { AddButton } from "./utils/add-button";
import { AvailableReceiptParticipantUsers } from "./available-receipt-participants-users";
import { trpc } from "../trpc";
import { InfiniteQueryWrapper } from "./utils/infinite-query-wrapper";
import { Block } from "./utils/block";
import { MutationWrapper } from "./utils/mutation-wrapper";
import { Text } from "../utils/styles";
import { ReceiptItemsGetInput } from "../utils/queries/receipt-items";
import {
	DEFAULT_PARTIAL_INPUT,
	getAvailableUserById,
	GetAvailableUsersInput,
	updateAvailableUsers,
} from "../utils/queries/receipt-users";
import {
	UseContextedMutationOptions,
	useTrpcMutationOptions,
} from "../hooks/use-trpc-mutation-options";
import { updateReceiptParticipants } from "../utils/queries/receipt-participants";

const mutationOptions: UseContextedMutationOptions<
	"receipt-participants.put",
	ReturnType<typeof getAvailableUserById>,
	{
		itemsInput: ReceiptItemsGetInput;
		usersInput: GetAvailableUsersInput;
		name?: string;
	}
> = {
	onMutate:
		(trpc, { itemsInput, usersInput, name }) =>
		(form) => {
			updateReceiptParticipants(trpc, itemsInput, (items) => [
				...items,
				{
					name: name || "unknown",
					userId: form.userId,
					role: form.role,
					resolved: false,
				},
			]);
			const addedUser = getAvailableUserById(trpc, usersInput, form.userId);
			updateAvailableUsers(trpc, usersInput, (page) =>
				page.filter((user) => user.id !== form.userId)
			);
			return addedUser;
		},
	onError:
		(trpc, { itemsInput, usersInput }) =>
		(_error, _variables, addedUserInfo) => {
			if (!addedUserInfo) {
				return;
			}
			updateReceiptParticipants(trpc, itemsInput, (items) =>
				items.filter((item) => item.userId !== addedUserInfo.user.id)
			);
			updateAvailableUsers(trpc, usersInput, (page, pageIndex) => {
				if (pageIndex !== addedUserInfo.pageIndex) {
					return page;
				}
				return [
					...page.slice(0, addedUserInfo.userIndex),
					addedUserInfo.user,
					...page.slice(addedUserInfo.userIndex),
				];
			});
		},
};

type Form = {
	user: {
		id: UsersId;
		name: string;
	};
};

type Props = {
	receiptItemsInput: ReceiptItemsGetInput;
};

export const AddReceiptParticipantForm: React.FC<Props> = ({
	receiptItemsInput,
}) => {
	const usersInput = {
		...DEFAULT_PARTIAL_INPUT,
		receiptId: receiptItemsInput.receiptId,
	};
	const availableUsersQuery = trpc.useInfiniteQuery([
		"users.get-available",
		usersInput,
	]);

	const {
		handleSubmit,
		formState: { isValid, isSubmitting },
		reset,
		watch,
		setValue,
	} = useForm<Form>({ mode: "onChange" });
	const selectedUserName = watch("user.name");
	const setUserValue = React.useCallback(
		(id: UsersId, name: string) => {
			setValue("user.id", id);
			setValue("user.name", name);
		},
		[setValue]
	);

	const addReceiptParticipantMutation = trpc.useMutation(
		"receipt-participants.put",
		useTrpcMutationOptions(mutationOptions, {
			itemsInput: receiptItemsInput,
			usersInput,
			name: selectedUserName,
		})
	);

	const onSubmit = React.useCallback<SubmitHandler<Form>>(
		async (values) => {
			const forcedValues = values as Form;
			await addReceiptParticipantMutation.mutateAsync({
				receiptId: receiptItemsInput.receiptId,
				userId: forcedValues.user.id,
				role: "editor",
			});
			reset();
		},
		[addReceiptParticipantMutation, receiptItemsInput.receiptId, reset]
	);

	return (
		<Block
			name={
				selectedUserName
					? `Add receipt participant ${selectedUserName}`
					: "Select someone please"
			}
		>
			<InfiniteQueryWrapper
				query={availableUsersQuery}
				setValue={setUserValue}
				disabled={isSubmitting}
			>
				{AvailableReceiptParticipantUsers}
			</InfiniteQueryWrapper>
			<AddButton
				onPress={handleSubmit(onSubmit)}
				disabled={!isValid || isSubmitting}
			>
				Add
			</AddButton>
			<MutationWrapper<"receipt-participants.put">
				mutation={addReceiptParticipantMutation}
			>
				{() => <Text>Add success!</Text>}
			</MutationWrapper>
		</Block>
	);
};
