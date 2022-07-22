import React from "react";

import { useForm } from "react-hook-form";

import { AddButton } from "app/components/add-button";
import { Block } from "app/components/block";
import { InfiniteQueryWrapper } from "app/components/infinite-query-wrapper";
import { MutationWrapper } from "app/components/mutation-wrapper";
import { useSubmitHandler } from "app/hooks/use-submit-handler";
import {
	UseContextedMutationOptions,
	useTrpcMutationOptions,
} from "app/hooks/use-trpc-mutation-options";
import { trpc } from "app/trpc";
import { ReceiptItemsGetInput } from "app/utils/queries/receipt-items";
import { updateReceiptParticipants } from "app/utils/queries/receipt-participants";
import {
	addAvailableUser,
	availableUsersGetPagedNextPage,
	DEFAULT_PARTIAL_INPUT,
	GetAvailableUsersInput,
	removeAvailableUser,
} from "app/utils/queries/users-get-available";
import { Text } from "app/utils/styles";
import { UsersId } from "next-app/db/models";

import { AvailableReceiptParticipantUsers } from "./available-receipt-participants-users";

const mutationOptions: UseContextedMutationOptions<
	"receipt-participants.put",
	ReturnType<typeof removeAvailableUser>,
	{
		itemsInput: ReceiptItemsGetInput;
		usersInput: GetAvailableUsersInput;
		name?: string;
	}
> = {
	onMutate:
		(trpcContext, { itemsInput, usersInput, name }) =>
		(form) => {
			updateReceiptParticipants(trpcContext, itemsInput, (items) => [
				...items,
				{
					name: name || "unknown",
					userId: form.userId,
					localUserId: form.userId,
					role: form.role,
					resolved: false,
					dirty: true,
					added: new Date(),
				},
			]);
			return removeAvailableUser(
				trpcContext,
				usersInput,
				(user) => user.id === form.userId
			);
		},
	onSuccess:
		(trpcContext, { itemsInput }) =>
		({ added }, form) => {
			updateReceiptParticipants(trpcContext, itemsInput, (participants) =>
				participants.map((participant) =>
					participant.userId === form.userId
						? { ...participant, added, dirty: false }
						: participant
				)
			);
		},
	onError:
		(trpcContext, { itemsInput, usersInput }) =>
		(_error, _variables, snapshot) => {
			if (!snapshot) {
				return;
			}
			updateReceiptParticipants(trpcContext, itemsInput, (items) =>
				items.filter((item) => item.userId !== snapshot.id)
			);
			addAvailableUser(trpcContext, usersInput, snapshot);
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
	const accountQuery = trpc.useQuery(["account.get"]);

	const usersInput = {
		...DEFAULT_PARTIAL_INPUT,
		receiptId: receiptItemsInput.receiptId,
	};
	const availableUsersQuery = trpc.useInfiniteQuery(
		["users.get-available", usersInput],
		{ getNextPageParam: availableUsersGetPagedNextPage }
	);

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

	const onSubmit = useSubmitHandler<Form>(
		(values) =>
			addReceiptParticipantMutation.mutateAsync({
				receiptId: receiptItemsInput.receiptId,
				userId: values.user.id,
				role: values.user.id === accountQuery.data!.id ? "owner" : "editor",
			}),
		[addReceiptParticipantMutation, receiptItemsInput.receiptId, reset],
		reset
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
				disabled={!isValid || isSubmitting || accountQuery.status !== "success"}
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
