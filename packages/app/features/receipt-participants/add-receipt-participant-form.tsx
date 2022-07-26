import React from "react";

import { Button, Modal, Text } from "@nextui-org/react";
import { useForm } from "react-hook-form";
import { MdAdd as AddIcon } from "react-icons/md";

import { cache } from "app/cache";
import { AddButton } from "app/components/add-button";
import { InfiniteQueryWrapper } from "app/components/infinite-query-wrapper";
import { MutationWrapper } from "app/components/mutation-wrapper";
import { useSubmitHandler } from "app/hooks/use-submit-handler";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCInfiniteQueryResult } from "app/trpc";
import { ReceiptsId, UsersId } from "next-app/db/models";

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
	receiptId: ReceiptsId;
	isLoading: boolean;
};

export const AddReceiptParticipantForm: React.FC<Props> = ({
	receiptId,
	isLoading,
}) => {
	const [modalOpen, setModalOpen] = React.useState(false);
	const openModal = React.useCallback(() => setModalOpen(true), [setModalOpen]);
	const closeModal = React.useCallback(
		() => setModalOpen(false),
		[setModalOpen]
	);

	const accountQuery = trpc.useQuery(["account.get"]);

	const availableUsersQuery = trpc.useInfiniteQuery(
		["users.get-available", cache.users.getAvailable.useStore(receiptId)],
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
			receiptId,
			user: selectedUser!,
		})
	);

	const onSubmit = useSubmitHandler<Form>(
		(values) =>
			addReceiptParticipantMutation.mutateAsync({
				receiptId,
				userId: values.user.id,
				role: values.user.id === accountQuery.data!.id ? "owner" : "editor",
			}),
		[addReceiptParticipantMutation, receiptId, reset],
		reset
	);

	return (
		<>
			<Button
				bordered
				icon={<AddIcon size={24} />}
				disabled={isLoading}
				onClick={openModal}
				css={{ margin: "0 auto" }}
			/>
			<Modal
				closeButton
				aria-label="Receipt participant picker"
				open={modalOpen}
				onClose={closeModal}
				width="90%"
			>
				<Modal.Header>
					<Text h3>
						{selectedUserName
							? `Add receipt participant ${selectedUserName}`
							: "Select someone please"}
					</Text>
				</Modal.Header>
				<Modal.Body>
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
							!selectedUser ||
							isLoading
						}
					>
						Add
					</AddButton>
					<MutationWrapper<"receipt-participants.put">
						mutation={addReceiptParticipantMutation}
					>
						{() => <Text>Add success!</Text>}
					</MutationWrapper>
				</Modal.Body>
			</Modal>
		</>
	);
};
