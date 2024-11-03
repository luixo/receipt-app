import React from "react";
import { View } from "react-native";

import { ErrorMessage } from "~app/components/error-message";
import { RemoveButton } from "~app/components/remove-button";
import { useFormattedCurrency } from "~app/hooks/use-formatted-currency";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
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

import { useReceiptContext } from "./context";
import { useCanEdit } from "./hooks";
import { ReceiptItemNameInput } from "./receipt-item-name-input";
import { ReceiptItemPart } from "./receipt-item-part";
import { ReceiptItemParticipantChip } from "./receipt-item-participant-chip";
import { ReceiptItemPriceInput } from "./receipt-item-price-input";
import { ReceiptItemQuantityInput } from "./receipt-item-quantity-input";
import type { Item } from "./state";

type Props = {
	item: Item;
};

export const ReceiptItem = React.forwardRef<HTMLDivElement, Props>(
	({ item }, ref) => {
		const { receiptId, currencyCode, participants } = useReceiptContext();
		const canEdit = useCanEdit();
		const currency = useFormattedCurrency(currencyCode);
		const removeReceiptItemMutation = trpc.receiptItems.remove.useMutation(
			useTrpcMutationOptions(receiptItemsRemoveOptions, {
				context: receiptId,
			}),
		);
		const removeItem = React.useCallback(
			() => removeReceiptItemMutation.mutate({ id: item.id }),
			[removeReceiptItemMutation, item.id],
		);
		const isRemovalPending = removeReceiptItemMutation.status === "pending";

		const addedParticipants = item.parts.map((part) => part.userId);
		const notAddedParticipants = participants.filter(
			(participant) => !addedParticipants.includes(participant.userId),
		);
		const notAddedParticipantsIds = notAddedParticipants.map(
			(participant) => participant.userId,
		) as [UsersId, ...UsersId[]];

		const addItemPartMutation = trpc.itemParticipants.add.useMutation(
			useTrpcMutationOptions(itemParticipantsAddOptions, {
				context: receiptId,
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

		return (
			<Card ref={ref}>
				<CardHeader className="justify-between gap-4">
					<ReceiptItemNameInput item={item} isDisabled={isRemovalPending} />
					{!canEdit ? null : (
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
						<ReceiptItemPriceInput item={item} isDisabled={isRemovalPending} />
						<ReceiptItemQuantityInput
							item={item}
							isDisabled={isRemovalPending}
						/>
						<Text>
							= {round(item.quantity * item.price)} {currency.symbol}
						</Text>
					</View>
					{!canEdit || notAddedParticipants.length === 0 ? null : (
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
								<ReceiptItemParticipantChip
									key={participant.userId}
									item={item}
									participant={participant}
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
										part={part}
										item={item}
										participant={matchedParticipant}
										isDisabled={isRemovalPending}
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
