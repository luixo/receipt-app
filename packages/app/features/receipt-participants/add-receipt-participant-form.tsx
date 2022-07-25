import React from "react";

import { useForm } from "react-hook-form";

import { cache, Cache } from "app/cache";
import { AddButton } from "app/components/add-button";
import { Block } from "app/components/block";
import { InfiniteQueryWrapper } from "app/components/infinite-query-wrapper";
import { MutationWrapper } from "app/components/mutation-wrapper";
import { useSubmitHandler } from "app/hooks/use-submit-handler";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCInfiniteQueryResult } from "app/trpc";
import { Text } from "app/utils/styles";
import { UsersId } from "next-app/db/models";

import { AvailableReceiptParticipantUsers } from "./available-receipt-participants-users";

type SelectedUser = Parameters<
	NonNullable<
		typeof cache["receiptParticipants"]["put"]["mutationOptions"]["onSuccess"]
	>
>[1]["user"];

type AvailableUsersResult = TRPCInfiniteQueryResult<"users.get-available">;

const getSelectedUser = (
	query: AvailableUsersResult,
	selectedId: UsersId
): SelectedUser | undefined => {
	if (query.status !== "success") {
		return;
	}
	const allUsers = query.data.pages.reduce<
		typeof query.data["pages"][number]["items"]
	>((acc, page) => [...acc, ...page.items], []);
	return allUsers.find((user) => user.id === selectedId);
};

type Form = {
	user: {
		id: UsersId;
		name: string;
	};
};

type Props = {
	receiptItemsInput: Cache.ReceiptItems.Get.Input;
};

export const AddReceiptParticipantForm: React.FC<Props> = ({
	receiptItemsInput,
}) => {
	const accountQuery = trpc.useQuery(["account.get"]);

	const usersInput = {
		...cache.users.getAvailable.DEFAULT_PARTIAL_INPUT,
		receiptId: receiptItemsInput.receiptId,
	};
	const availableUsersQuery = trpc.useInfiniteQuery(
		["users.get-available", usersInput],
		{ getNextPageParam: cache.users.getAvailable.getNextPage }
	);

	const {
		handleSubmit,
		formState: { isValid, isSubmitting },
		reset,
		watch,
		setValue,
	} = useForm<Form>({ mode: "onChange" });
	const selectedUserName = watch("user.name");
	const selectedUser = getSelectedUser(availableUsersQuery, watch("user.id"));
	const setUserValue = React.useCallback(
		(id: UsersId, name: string) => {
			setValue("user.id", id);
			setValue("user.name", name);
		},
		[setValue]
	);

	const addReceiptParticipantMutation = trpc.useMutation(
		"receipt-participants.put",
		useTrpcMutationOptions(cache.receiptParticipants.put.mutationOptions, {
			itemsInput: receiptItemsInput,
			usersInput,
			user: selectedUser!,
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
				disabled={
					!isValid ||
					isSubmitting ||
					accountQuery.status !== "success" ||
					!selectedUser
				}
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
