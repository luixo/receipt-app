import React from "react";
import { View } from "react-native";

import { ErrorMessage } from "~app/components/error-message";
import { RemoveButton } from "~app/components/remove-button";
import { ReceiptItemPart } from "~app/features/receipt-item-parts/receipt-item-part";
import { useFormattedCurrency } from "~app/hooks/use-formatted-currency";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { Card, CardBody, CardHeader } from "~components/card";
import { Chip } from "~components/chip";
import { Divider } from "~components/divider";
import { ScrollShadow } from "~components/scroll-shadow";
import { Text } from "~components/text";
import type { UsersId } from "~db/models";
import { options as itemParticipantsAddOptions } from "~mutations/item-participants/add";
import { options as receiptItemsRemoveOptions } from "~mutations/receipt-items/remove";
import { round } from "~utils/math";

import { ParticipantChip } from "./participant-chip";
import { ReceiptItemNameInput } from "./receipt-item-name-input";
import { ReceiptItemPriceInput } from "./receipt-item-price-input";
import { ReceiptItemQuantityInput } from "./receipt-item-quantity-input";

type Props = {
	item: TRPCQueryOutput<"receipts.get">["items"][number];
	receipt: TRPCQueryOutput<"receipts.get">;
	isDisabled: boolean;
};

export const ReceiptItem = React.forwardRef<HTMLDivElement, Props>(
	({ item, receipt, isDisabled: isExternalDisabled }, ref) => {
		const currency = useFormattedCurrency(receipt.currencyCode);
		const removeReceiptItemMutation = trpc.receiptItems.remove.useMutation(
			useTrpcMutationOptions(receiptItemsRemoveOptions, {
				context: receipt.id,
			}),
		);
		const removeItem = React.useCallback(
			() => removeReceiptItemMutation.mutate({ id: item.id }),
			[removeReceiptItemMutation, item.id],
		);

		const addedParticipants = item.parts.map((part) => part.userId);
		const notAddedParticipants = receipt.participants.filter(
			(participant) => !addedParticipants.includes(participant.userId),
		);
		const notAddedParticipantsIds = notAddedParticipants.map(
			(participant) => participant.userId,
		) as [UsersId, ...UsersId[]];

		const addItemPartMutation = trpc.itemParticipants.add.useMutation(
			useTrpcMutationOptions(itemParticipantsAddOptions, {
				context: receipt.id,
			}),
		);
		const addEveryParticipant = React.useCallback(() => {
			notAddedParticipantsIds.forEach((participantId) => {
				addItemPartMutation.mutate({
					itemId: item.id,
					userId: participantId,
					part: 1,
				});
			});
		}, [addItemPartMutation, notAddedParticipantsIds, item.id]);

		const isDisabled =
			isExternalDisabled || removeReceiptItemMutation.isPending;
		const selfRole =
			receipt.participants.find(
				(participant) => participant.userId === receipt.selfUserId,
			)?.role ?? "owner";
		const isEditingDisabled = selfRole === "viewer";

		return (
			<Card ref={ref}>
				<CardHeader className="justify-between gap-4">
					<ReceiptItemNameInput
						receipt={receipt}
						item={item}
						readOnly={isEditingDisabled}
						isDisabled={isDisabled}
					/>
					{isEditingDisabled ? null : (
						<RemoveButton
							onRemove={removeItem}
							mutation={removeReceiptItemMutation}
							subtitle="This will remove item with all participant's parts"
							noConfirm={item.parts.length === 0}
							isIconOnly
						/>
					)}
				</CardHeader>
				<Divider />
				<CardBody className="gap-2">
					<View className="flex-row items-center gap-2">
						<ReceiptItemPriceInput
							item={item}
							receipt={receipt}
							readOnly={isEditingDisabled}
							isDisabled={isDisabled}
						/>
						<ReceiptItemQuantityInput
							item={item}
							receipt={receipt}
							readOnly={isEditingDisabled}
							isDisabled={isDisabled}
						/>
						<Text>
							= {round(item.quantity * item.price)} {currency.symbol}
						</Text>
					</View>
					{isEditingDisabled || notAddedParticipants.length === 0 ? null : (
						<ScrollShadow
							orientation="horizontal"
							className="flex w-full flex-row gap-1 overflow-x-auto"
						>
							{notAddedParticipants.length > 1 ? (
								<Chip
									color="secondary"
									className="cursor-pointer"
									onClick={addEveryParticipant}
								>
									Everyone
								</Chip>
							) : null}
							{notAddedParticipants.map((participant) => (
								<ParticipantChip
									key={participant.userId}
									item={item}
									receipt={receipt}
									participant={participant}
								/>
							))}
						</ScrollShadow>
					)}
					{item.parts.length === 0 ? null : (
						<>
							<Divider />
							{item.parts.map((part) => {
								const matchedParticipant = receipt.participants.find(
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
										part={part}
										item={item}
										participant={matchedParticipant}
										receipt={receipt}
										readOnly={isEditingDisabled}
										isDisabled={isDisabled}
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
