import React from "react";
import { View } from "react-native";

import {
	Card,
	CardBody,
	CardHeader,
	Divider,
	ScrollShadow,
} from "@nextui-org/react";

import { ReceiptItemLockedButton } from "app/components/app/receipt-item-locked-button";
import { Text } from "app/components/base/text";
import { ErrorMessage } from "app/components/error-message";
import { RemoveButton } from "app/components/remove-button";
import { ReceiptItemPart } from "app/features/receipt-item-parts/receipt-item-part";
import { useFormattedCurrency } from "app/hooks/use-formatted-currency";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";
import type { CurrencyCode } from "app/utils/currency";
import { round } from "app/utils/math";
import type { ReceiptsId, UsersId } from "next-app/db/models";
import type { Role } from "next-app/handlers/receipts/utils";

import { EVERY_PARTICIPANT_TAG, ParticipantChip } from "./participant-chip";
import { ReceiptItemNameInput } from "./receipt-item-name-input";
import { ReceiptItemPriceInput } from "./receipt-item-price-input";
import { ReceiptItemQuantityInput } from "./receipt-item-quantity-input";

type ReceiptItems = TRPCQueryOutput<"receiptItems.get">["items"];
type ReceiptParticipant =
	TRPCQueryOutput<"receiptItems.get">["participants"][number];

type Props = {
	receiptLocked: boolean;
	receiptId: ReceiptsId;
	receiptItem: ReceiptItems[number];
	receiptParticipants: ReceiptParticipant[];
	currencyCode?: CurrencyCode;
	role: Role;
	isLoading: boolean;
};

export const ReceiptItem = React.forwardRef<HTMLDivElement, Props>(
	(
		{
			receiptLocked,
			receiptItem,
			receiptParticipants,
			receiptId,
			currencyCode,
			role,
			isLoading: isReceiptDeleteLoading,
		},
		ref,
	) => {
		const currency = useFormattedCurrency(currencyCode);
		const removeReceiptItemMutation = trpc.receiptItems.remove.useMutation(
			useTrpcMutationOptions(mutations.receiptItems.remove.options, {
				context: receiptId,
			}),
		);
		const removeItem = React.useCallback(
			() => removeReceiptItemMutation.mutate({ id: receiptItem.id }),
			[removeReceiptItemMutation, receiptItem.id],
		);

		const addedParticipants = receiptItem.parts.map((part) => part.userId);
		const notAddedParticipants = receiptParticipants.filter(
			(participant) => !addedParticipants.includes(participant.userId),
		);

		const isDeleteLoading =
			isReceiptDeleteLoading || removeReceiptItemMutation.isPending;
		const itemParts = receiptItem.parts.reduce(
			(acc, itemPart) => acc + itemPart.part,
			0,
		);
		const isEditingDisabled = role === "viewer" || receiptItem.locked;

		return (
			<Card ref={ref}>
				<CardHeader className="justify-between gap-4">
					<ReceiptItemNameInput
						receiptId={receiptId}
						receiptItem={receiptItem}
						readOnly={isEditingDisabled || receiptLocked}
						isLoading={isDeleteLoading}
					/>
					<View className="flex-row gap-4">
						<ReceiptItemLockedButton
							receiptId={receiptId}
							receiptItemId={receiptItem.id}
							locked={receiptItem.locked}
							isDisabled={role === "viewer"}
						/>
						{isEditingDisabled ? null : (
							<RemoveButton
								onRemove={removeItem}
								isDisabled={receiptLocked}
								mutation={removeReceiptItemMutation}
								subtitle="This will remove item with all participant's parts"
								noConfirm={receiptItem.parts.length === 0}
								isIconOnly
							/>
						)}
					</View>
				</CardHeader>
				<Divider />
				<CardBody className="gap-2">
					<View className="flex-row items-center gap-2">
						<ReceiptItemPriceInput
							receiptId={receiptId}
							receiptItem={receiptItem}
							currencyCode={currencyCode}
							readOnly={isEditingDisabled || receiptLocked}
							isLoading={isDeleteLoading}
						/>
						<ReceiptItemQuantityInput
							receiptId={receiptId}
							receiptItem={receiptItem}
							readOnly={isEditingDisabled || receiptLocked}
							isLoading={isDeleteLoading}
						/>
						<Text>
							= {round(receiptItem.quantity * receiptItem.price)} {currency}
						</Text>
					</View>
					{receiptLocked ||
					isEditingDisabled ||
					notAddedParticipants.length === 0 ? null : (
						<ScrollShadow
							orientation="horizontal"
							className="flex w-full flex-row gap-1 overflow-x-auto"
						>
							{(notAddedParticipants.length === 1
								? notAddedParticipants
								: [EVERY_PARTICIPANT_TAG, ...notAddedParticipants]
							).map((participant) => (
								<ParticipantChip
									key={
										participant === EVERY_PARTICIPANT_TAG
											? participant
											: participant.userId
									}
									receiptId={receiptId}
									receiptItemId={receiptItem.id}
									participant={participant}
									isDisabled={receiptLocked}
									notAddedParticipantIds={
										notAddedParticipants.map(({ userId }) => userId) as [
											UsersId,
											...UsersId[],
										]
									}
								/>
							))}
						</ScrollShadow>
					)}
					{receiptItem.parts.length === 0 ? null : (
						<>
							<Divider />
							{receiptItem.parts.map((part) => {
								const matchedParticipant = receiptParticipants.find(
									(participant) => participant.userId === part.userId,
								);
								if (!matchedParticipant) {
									return (
										<ErrorMessage
											key={part.userId}
											message={`Part for user id ${part.userId} is orphaned. Please report this to support, include receipt id, receipt item name and mentioned user id`}
										/>
									);
								}
								return (
									<ReceiptItemPart
										key={part.userId}
										receiptId={receiptId}
										itemPart={part}
										itemParts={itemParts}
										participant={matchedParticipant}
										receiptItemId={receiptItem.id}
										readOnly={isEditingDisabled || receiptLocked}
										isLoading={isDeleteLoading}
									/>
								);
							})}
						</>
					)}
				</CardBody>
			</Card>
		);
	},
);
