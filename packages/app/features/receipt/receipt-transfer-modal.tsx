import React from "react";
import { View } from "react-native";

import {
	Button,
	Modal,
	ModalBody,
	ModalContent,
	ModalHeader,
	Tooltip,
} from "@nextui-org/react";
import {
	MdInfoOutline as InfoIcon,
	MdOutlineNorthEast as TransferIcon,
} from "react-icons/md";

import { LoadableUser } from "app/components/app/loadable-user";
import { UsersSuggest } from "app/components/app/users-suggest";
import { Text } from "app/components/base/text";
import { useBooleanState } from "app/hooks/use-boolean-state";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { type TRPCQueryOutput, trpc } from "app/trpc";

type Receipt = TRPCQueryOutput<"receipts.get">;

const ReceiptSendTransferIntentionBody: React.FC<{
	receipt: Receipt;
	closeModal: () => void;
}> = ({ receipt, closeModal }) => {
	const [selectedUser, setSelectedUser] = React.useState<
		TRPCQueryOutput<"users.suggest">["items"][number] | undefined
	>();
	const suggestOptions = React.useMemo(
		() => ({ type: "connected" as const }),
		[],
	);
	const receiptItemsQuery = trpc.receiptItems.get.useQuery({
		receiptId: receipt.id,
	});
	const nextSum =
		receiptItemsQuery.data?.items.reduce(
			(acc, item) => acc + item.price * item.quantity,
			0,
		) ?? 0;
	const transferReceiptMutation =
		trpc.receiptTransferIntentions.add.useMutation(
			useTrpcMutationOptions(mutations.receiptTransferIntentions.add.options, {
				context: {
					receipt: {
						name: receipt.name,
						issued: receipt.issued,
						currencyCode: receipt.currencyCode,
						sum: nextSum,
					},
					targetUserId: selectedUser?.id ?? "unknown",
				},
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
	return (
		<>
			<UsersSuggest
				selected={selectedUser}
				onUserClick={setSelectedUser}
				options={suggestOptions}
				label="Transfer to"
				menuTrigger={selectedUser ? "manual" : undefined}
			/>
			<Button
				isDisabled={
					transferReceiptMutation.isPending ||
					!selectedUser ||
					!receiptItemsQuery.data
				}
				isLoading={transferReceiptMutation.isPending}
				onClick={transferReceipt(
					selectedUser?.connectedAccount?.email ?? "unknown",
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
			useTrpcMutationOptions(
				mutations.receiptTransferIntentions.remove.options,
				{ onMutate: closeModal },
			),
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
	const receiptItemsQuery = trpc.receiptItems.get.useQuery({
		receiptId: receipt.id,
	});
	const hasParticipants =
		receiptItemsQuery.data?.participants.length !== 0 ?? true;
	const button = (
		<Button
			onClick={openTransferModal}
			color="primary"
			variant="bordered"
			isDisabled={
				deleteLoading || hasParticipants || Boolean(receipt.lockedTimestamp)
			}
			title="Transfer receipt modal"
		>
			{receipt.transferIntentionUserId ? (
				<InfoIcon className="shrink-0" size={24} />
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
					content={
						hasParticipants
							? "You can only transfer a receipt with no participants in it"
							: undefined
					}
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
