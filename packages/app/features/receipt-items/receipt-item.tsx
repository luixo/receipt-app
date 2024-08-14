import React from "react";
import { View } from "react-native";

import { ReceiptItemLockedButton } from "~app/components/app/receipt-item-locked-button";
import { ErrorMessage } from "~app/components/error-message";
import { RemoveButton } from "~app/components/remove-button";
import { ReceiptItemPart } from "~app/features/receipt-item-parts/receipt-item-part";
import { useFormattedCurrency } from "~app/hooks/use-formatted-currency";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import type { CurrencyCode } from "~app/utils/currency";
import {
	Card,
	CardBody,
	CardHeader,
	Chip,
	Divider,
	ScrollShadow,
	Text,
} from "~components";
import type { ReceiptsId, UsersId } from "~db/models";
import * as mutations from "~mutations";
import { round } from "~utils/math";

import { ParticipantChip } from "./participant-chip";
import { ReceiptItemNameInput } from "./receipt-item-name-input";
import { ReceiptItemPriceInput } from "./receipt-item-price-input";
import { ReceiptItemQuantityInput } from "./receipt-item-quantity-input";

type Props = {
	receiptId: ReceiptsId;
	item: TRPCQueryOutput<"receipts.get">["items"][number];
	selfUserId: UsersId;
	receiptLocked: boolean;
	currencyCode: CurrencyCode;
	participants: TRPCQueryOutput<"receipts.get">["participants"];
	isLoading: boolean;
};

export const ReceiptItem = React.forwardRef<HTMLDivElement, Props>(
	(
		{
			receiptId,
			item,
			selfUserId,
			receiptLocked,
			participants,
			currencyCode,
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
			() => removeReceiptItemMutation.mutate({ id: item.id }),
			[removeReceiptItemMutation, item.id],
		);

		const addedParticipants = item.parts.map((part) => part.userId);
		const notAddedParticipants = participants.filter(
			(participant) => !addedParticipants.includes(participant.userId),
		);
		const notAddedParticipantsIds = notAddedParticipants.map(
			(participant) => participant.userId,
		) as [UsersId, ...UsersId[]];

		const addItemPartMutation = trpc.itemParticipants.add.useMutation(
			useTrpcMutationOptions(mutations.itemParticipants.add.options, {
				context: receiptId,
			}),
		);
		const addEveryParticipant = React.useCallback(() => {
			addItemPartMutation.mutate({
				itemId: item.id,
				userIds: notAddedParticipantsIds,
			});
		}, [addItemPartMutation, notAddedParticipantsIds, item.id]);

		const isDeleteLoading =
			isReceiptDeleteLoading || removeReceiptItemMutation.isPending;
		const itemParts = item.parts.reduce(
			(acc, itemPart) => acc + itemPart.part,
			0,
		);
		const selfRole =
			participants.find((participant) => participant.userId === selfUserId)
				?.role ?? "owner";
		const isOwner = selfRole === "owner";
		const isEditingDisabled = selfRole === "viewer" || item.locked;

		return (
			<Card ref={ref}>
				<CardHeader className="justify-between gap-4">
					<ReceiptItemNameInput
						receiptId={receiptId}
						receiptItem={item}
						readOnly={isEditingDisabled || receiptLocked}
						isLoading={isDeleteLoading}
					/>
					<View className="flex-row gap-4">
						<ReceiptItemLockedButton
							receiptId={receiptId}
							receiptItemId={item.id}
							locked={item.locked}
							isDisabled={selfRole === "viewer"}
						/>
						{isEditingDisabled ? null : (
							<RemoveButton
								onRemove={removeItem}
								isDisabled={receiptLocked}
								mutation={removeReceiptItemMutation}
								subtitle="This will remove item with all participant's parts"
								noConfirm={item.parts.length === 0}
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
							receiptItem={item}
							currencyCode={currencyCode}
							readOnly={isEditingDisabled || receiptLocked}
							isLoading={isDeleteLoading}
						/>
						<ReceiptItemQuantityInput
							receiptId={receiptId}
							receiptItem={item}
							readOnly={isEditingDisabled || receiptLocked}
							isLoading={isDeleteLoading}
						/>
						<Text>
							= {round(item.quantity * item.price)} {currency}
						</Text>
					</View>
					{receiptLocked ||
					isEditingDisabled ||
					notAddedParticipants.length === 0 ? null : (
						<ScrollShadow
							orientation="horizontal"
							className="flex w-full flex-row gap-1 overflow-x-auto"
						>
							{notAddedParticipants.length > 1 ? (
								<Chip
									color="secondary"
									className="cursor-pointer"
									onClick={addEveryParticipant}
									isDisabled={receiptLocked}
								>
									Everyone
								</Chip>
							) : null}
							{notAddedParticipants.map((participant) => (
								<ParticipantChip
									key={participant.userId}
									receiptId={receiptId}
									receiptItemId={item.id}
									participant={participant}
									isDisabled={receiptLocked}
									isOwner={isOwner}
								/>
							))}
						</ScrollShadow>
					)}
					{item.parts.length === 0 ? null : (
						<>
							<Divider />
							{item.parts.map((part) => {
								const matchedParticipant = participants.find(
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
										receiptItemId={item.id}
										readOnly={isEditingDisabled || receiptLocked}
										isLoading={isDeleteLoading}
										isOwner={isOwner}
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
