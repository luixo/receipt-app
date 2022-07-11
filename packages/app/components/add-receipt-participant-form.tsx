import React from "react";

import { UsersId } from "next-app/db/models";
import { useForm } from "react-hook-form";

import { useSubmitHandler } from "../hooks/use-submit-handler";
import {
	UseContextedMutationOptions,
	useTrpcMutationOptions,
} from "../hooks/use-trpc-mutation-options";
import { trpc } from "../trpc";
import { ReceiptItemsGetInput } from "../utils/queries/receipt-items";
import { updateReceiptParticipants } from "../utils/queries/receipt-participants";
import {
	DEFAULT_PARTIAL_INPUT,
	getAvailableUserById,
	GetAvailableUsersInput,
	updateAvailableUsers,
} from "../utils/queries/receipt-users";
import { Text } from "../utils/styles";

import { AvailableReceiptParticipantUsers } from "./available-receipt-participants-users";
import { AddButton } from "./utils/add-button";
import { Block } from "./utils/block";
import { InfiniteQueryWrapper } from "./utils/infinite-query-wrapper";
import { MutationWrapper } from "./utils/mutation-wrapper";

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
			const addedUser = getAvailableUserById(
				trpcContext,
				usersInput,
				form.userId
			);
			updateAvailableUsers(trpcContext, usersInput, (page) =>
				page.filter((user) => user.id !== form.userId)
			);
			return addedUser;
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
		(_error, _variables, addedUserInfo) => {
			if (!addedUserInfo) {
				return;
			}
			updateReceiptParticipants(trpcContext, itemsInput, (items) =>
				items.filter((item) => item.userId !== addedUserInfo.user.id)
			);
			updateAvailableUsers(trpcContext, usersInput, (page, pageIndex) => {
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
	const accountQuery = trpc.useQuery(["account.get"]);

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
