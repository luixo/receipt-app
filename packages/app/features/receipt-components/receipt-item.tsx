import React from "react";
import { View } from "react-native";

import { ErrorMessage } from "~app/components/error-message";
import { RemoveButton } from "~app/components/remove-button";
import { useFormattedCurrency } from "~app/hooks/use-formatted-currency";
import { useTrpcMutationState } from "~app/hooks/use-trpc-mutation-state";
import { trpc } from "~app/trpc";
import { Card, CardBody, CardHeader } from "~components/card";
import { Chip } from "~components/chip";
import { Divider } from "~components/divider";
import { ScrollShadow } from "~components/scroll-shadow";
import { Text } from "~components/text";
import { round } from "~utils/math";

import { useActionsHooksContext, useReceiptContext } from "./context";
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
		const { currencyCode, participants } = useReceiptContext();
		const { addItemPart, removeItem } = useActionsHooksContext();
		const canEdit = useCanEdit();
		const currency = useFormattedCurrency(currencyCode);

		const removeItemMutationState = useTrpcMutationState<"receiptItems.remove">(
			trpc.receiptItems.remove,
			(vars) => vars.id === item.id,
		);
		const isRemovalPending = removeItemMutationState?.status === "pending";

		const notAddedParticipants = React.useMemo(() => {
			const addedParticipants = item.parts.map((part) => part.userId);
			return participants.filter(
				(participant) => !addedParticipants.includes(participant.userId),
			);
		}, [item.parts, participants]);
		const onAddEveryItemParticipant = React.useCallback(() => {
			notAddedParticipants.forEach((participant) => {
				addItemPart(item.id, participant.userId, 1);
			});
		}, [addItemPart, item.id, notAddedParticipants]);

		return (
			<Card ref={ref}>
				<CardHeader className="justify-between gap-4">
					<ReceiptItemNameInput item={item} isDisabled={isRemovalPending} />
					{!canEdit ? null : (
						<RemoveButton
							onRemove={() => removeItem(item.id)}
							mutation={{ isPending: isRemovalPending }}
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
									onClick={onAddEveryItemParticipant}
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
