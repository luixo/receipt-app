import React from "react";
import { View } from "react-native";

import { skipToken } from "@tanstack/react-query";

import { LoadableUser } from "~app/components/app/loadable-user";
import { UsersSuggest } from "~app/components/app/users-suggest";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { type TRPCQueryOutput, trpc } from "~app/trpc";
import { Button } from "~components/button";
import { InfoOutlineIcon, TransferIcon } from "~components/icons";
import { Modal, ModalBody, ModalContent, ModalHeader } from "~components/modal";
import { Text } from "~components/text";
import { Tooltip } from "~components/tooltip";
import type { UsersId } from "~db/models";
import { options as receiptTransferIntentionsAddOptions } from "~mutations/receipt-transfer-intentions/add";
import { options as receiptTransferIntentionsRemoveOptions } from "~mutations/receipt-transfer-intentions/remove";
import { round } from "~utils/math";

type Receipt = TRPCQueryOutput<"receipts.get">;

const ReceiptSendTransferIntentionBody: React.FC<{
	receipt: Receipt;
	closeModal: () => void;
}> = ({ receipt, closeModal }) => {
	const [selectedUserId, setSelectedUserId] = React.useState<UsersId>();
	const suggestOptions = React.useMemo(
		() => ({ type: "connected" as const }),
		[],
	);
	const nextSum = round(
		receipt.items.reduce((acc, item) => acc + item.price * item.quantity, 0),
	);
	const transferReceiptMutation =
		trpc.receiptTransferIntentions.add.useMutation(
			useTrpcMutationOptions(receiptTransferIntentionsAddOptions, {
				context: selectedUserId
					? {
							receipt: {
								name: receipt.name,
								issued: receipt.issued,
								currencyCode: receipt.currencyCode,
								sum: nextSum,
							},
							targetUserId: selectedUserId,
					  }
					: skipToken,
				onMutate: closeModal,
			}),
		);
	const transferReceipt = React.useCallback(
		(email: string) => () =>
			transferReceiptMutation.mutate({
				receiptId: receipt.id,
				targetEmail: email,
			}),
		[transferReceiptMutation, receipt.id],
	);
	const userQuery = trpc.users.get.useQuery(
		selectedUserId ? { id: selectedUserId } : skipToken,
	);
	return (
		<>
			<UsersSuggest
				selected={selectedUserId}
				onUserClick={setSelectedUserId}
				options={suggestOptions}
				label="Transfer to"
				menuTrigger={selectedUserId ? "manual" : undefined}
			/>
			<Button
				isDisabled={transferReceiptMutation.isPending || !selectedUserId}
				isLoading={transferReceiptMutation.isPending}
				onClick={transferReceipt(
					userQuery.data?.connectedAccount?.email ?? "unknown",
				)}
				color="primary"
				title="Send receipt transfer request"
			>
				Send transfer request
			</Button>
		</>
	);
};

const ReceiptTransferStatusBody: React.FC<{
	receipt: Receipt;
	closeModal: () => void;
}> = ({ receipt, closeModal }) => {
	const cancelTransferReceiptMutation =
		trpc.receiptTransferIntentions.remove.useMutation(
			useTrpcMutationOptions(receiptTransferIntentionsRemoveOptions, {
				onMutate: closeModal,
			}),
		);
	const cancelTransferReceipt = React.useCallback(
		() =>
			cancelTransferReceiptMutation.mutate({
				receiptId: receipt.id,
			}),
		[cancelTransferReceiptMutation, receipt.id],
	);
	return (
		<Button
			isDisabled={cancelTransferReceiptMutation.isPending}
			isLoading={cancelTransferReceiptMutation.isPending}
			onClick={cancelTransferReceipt}
			color="danger"
			variant="bordered"
			title="Cancel receipt transfer request"
		>
			Cancel transfer request
		</Button>
	);
};

type Props = {
	receipt: Receipt;
	deleteLoading: boolean;
};

export const ReceiptTransferModal: React.FC<Props> = ({
	receipt,
	deleteLoading,
}) => {
	const [
		transferModalOpen,
		{
			switchValue: switchTransferModal,
			setTrue: openTransferModal,
			setFalse: closeTransferModal,
		},
	] = useBooleanState();
	const hasParticipants = receipt.participants.length !== 0;
	const button = (
		<Button
			onClick={openTransferModal}
			color="primary"
			variant="bordered"
			isDisabled={deleteLoading || hasParticipants}
			title="Transfer receipt modal"
		>
			{receipt.transferIntentionUserId ? (
				<InfoOutlineIcon className="shrink-0" size={24} />
			) : (
				<TransferIcon className="shrink-0" size={24} />
			)}
			{receipt.transferIntentionUserId
				? "Transfer details"
				: "Transfer receipt"}
		</Button>
	);
	return (
		<>
			<Modal
				aria-label="Transfer receipt"
				isOpen={transferModalOpen}
				onOpenChange={switchTransferModal}
				scrollBehavior="inside"
				classNames={{ base: "mb-24 sm:mb-32 max-w-xl" }}
			>
				<ModalContent>
					<ModalHeader>
						{receipt.transferIntentionUserId ? (
							<View className="items-start gap-2">
								<Text className="text-2xl font-medium">
									Transfer intention is sent to
								</Text>
								<LoadableUser id={receipt.transferIntentionUserId} />
							</View>
						) : (
							<Text className="text-2xl font-medium">
								Who should we transfer receipt to?
							</Text>
						)}
					</ModalHeader>
					<ModalBody>
						{receipt.transferIntentionUserId ? (
							<ReceiptTransferStatusBody
								receipt={receipt}
								closeModal={closeTransferModal}
							/>
						) : (
							<ReceiptSendTransferIntentionBody
								receipt={receipt}
								closeModal={closeTransferModal}
							/>
						)}
					</ModalBody>
				</ModalContent>
			</Modal>
			{hasParticipants ? (
				<Tooltip
					content="You can only transfer a receipt with no participants in it"
					placement="bottom-end"
				>
					<span>{button}</span>
				</Tooltip>
			) : (
				button
			)}
		</>
	);
};
