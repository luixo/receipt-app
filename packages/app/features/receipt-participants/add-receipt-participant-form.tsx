import React from "react";

import { Button, Loading, Modal, Spacer, Text } from "@nextui-org/react";
import { MdAdd as AddIcon } from "react-icons/md";

import { cache } from "app/cache";
import { MutationErrorMessage } from "app/components/mutation-error-message";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCInfiniteQueryOutput } from "app/trpc";
import { ReceiptsId } from "next-app/db/models";

import { ParticipantPicker } from "./participant-picker";

type Props = {
	receiptId: ReceiptsId;
	disabled: boolean;
};

export const AddReceiptParticipantForm: React.FC<Props> = ({
	receiptId,
	disabled,
}) => {
	const [modalOpen, setModalOpen] = React.useState(false);
	const openModal = React.useCallback(() => setModalOpen(true), [setModalOpen]);
	const closeModal = React.useCallback(
		() => setModalOpen(false),
		[setModalOpen]
	);

	const addMutation = trpc.useMutation(
		"receipt-participants.put",
		useTrpcMutationOptions(
			cache.receiptParticipants.put.mutationOptions,
			receiptId
		)
	);

	const addParticipant = React.useCallback(
		(user: TRPCInfiniteQueryOutput<"users.get-available">["items"][number]) => {
			closeModal();
			addMutation.mutate({
				receiptId,
				userId: user.id,
				role: "editor",
			});
		},
		[addMutation, receiptId, closeModal]
	);

	return (
		<>
			<Button
				bordered
				icon={
					addMutation.isLoading ? <Loading size="xs" /> : <AddIcon size={24} />
				}
				disabled={disabled || addMutation.isLoading}
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
					<Text h3>Click user to add to the receipt</Text>
				</Modal.Header>
				<Modal.Body>
					<ParticipantPicker
						receiptId={receiptId}
						disabled={disabled}
						onUserClick={addParticipant}
					/>
					<Spacer y={1} />
				</Modal.Body>
			</Modal>
			{addMutation.status === "error" ? (
				<MutationErrorMessage mutation={addMutation} />
			) : null}
		</>
	);
};
