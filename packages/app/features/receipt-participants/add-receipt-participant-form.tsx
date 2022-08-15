import React from "react";

import { Button, Loading, Modal, Spacer, Text } from "@nextui-org/react";
import { MdAdd as AddIcon } from "react-icons/md";

import { cache } from "app/cache";
import { MutationErrorMessage } from "app/components/error-message";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import { useBooleanState } from "app/hooks/use-boolean-state";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCInfiniteQueryOutput } from "app/trpc";
import { ReceiptsId, UsersId } from "next-app/db/models";

import { ParticipantPicker } from "./participant-picker";

type Props = {
	receiptId: ReceiptsId;
	disabled: boolean;
};

export const AddReceiptParticipantForm: React.FC<Props> = ({
	receiptId,
	disabled,
}) => {
	const [modalOpen, { setTrue: openModal, setFalse: closeModal }] =
		useBooleanState();

	const addMutation = trpc.useMutation(
		"receipt-participants.put",
		useTrpcMutationOptions(
			cache.receiptParticipants.put.mutationOptions,
			receiptId
		)
	);

	const [selectedParticipants, setSelectedParticipants] = React.useState<
		TRPCInfiniteQueryOutput<"users.get-available">["items"]
	>([]);
	const onParticipantClick = React.useCallback(
		(
			participant: TRPCInfiniteQueryOutput<"users.get-available">["items"][number]
		) =>
			setSelectedParticipants((prevParticipants) => {
				const matchedIndex = prevParticipants.indexOf(participant);
				if (matchedIndex === -1) {
					return [...prevParticipants, participant];
				}
				return [
					...prevParticipants.slice(0, matchedIndex),
					...prevParticipants.slice(matchedIndex + 1),
				];
			}),
		[setSelectedParticipants]
	);
	const addParticipants = useAsyncCallback(
		async (isMount) => {
			if (selectedParticipants.length === 0) {
				return;
			}
			await addMutation.mutateAsync({
				receiptId,
				userIds: selectedParticipants.map((participant) => participant.id) as [
					UsersId,
					...UsersId[]
				],
				role: "editor",
			});
			if (!isMount()) {
				return;
			}
			setSelectedParticipants([]);
			closeModal();
		},
		[
			addMutation,
			receiptId,
			selectedParticipants,
			setSelectedParticipants,
			closeModal,
		]
	);

	return (
		<>
			<Button
				bordered
				icon={<AddIcon size={24} />}
				disabled={disabled}
				onClick={openModal}
				css={{ margin: "0 auto" }}
			>
				Participant
			</Button>
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
						disabled={disabled || addMutation.isLoading}
						onUserClick={onParticipantClick}
						selectedParticipants={selectedParticipants}
					/>
					<Spacer y={1} />
				</Modal.Body>
				<Modal.Footer>
					<Button onClick={addParticipants}>
						{addMutation.isLoading ? (
							<Loading color="currentColor" size="sm" />
						) : (
							"Save"
						)}
					</Button>
					{addMutation.status === "error" ? (
						<>
							<Spacer y={1} />
							<MutationErrorMessage mutation={addMutation} />
						</>
					) : null}
				</Modal.Footer>
			</Modal>
		</>
	);
};
