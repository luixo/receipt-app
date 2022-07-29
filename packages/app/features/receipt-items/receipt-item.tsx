import React from "react";

import { Card, Spacer, styled, Text } from "@nextui-org/react";

import { cache } from "app/cache";
import { ButtonsGroup } from "app/components/buttons-group";
import { ErrorMessage } from "app/components/error-message";
import { ReceiptItemLockedButton } from "app/components/receipt-item-locked-button";
import { RemoveButton } from "app/components/remove-button";
import { ReceiptItemPart } from "app/features/receipt-item-parts/receipt-item-part";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { Currency } from "app/utils/currency";
import { ReceiptsId } from "next-app/db/models";
import { Role } from "next-app/handlers/receipts/utils";

import { ReceiptItemNameInput } from "./receipt-item-name-input";
import { ReceiptItemPriceInput } from "./receipt-item-price-input";
import { ReceiptItemQuantityInput } from "./receipt-item-quantity-input";

const Sum = styled("div", { display: "flex" });

type ReceiptItems = TRPCQueryOutput<"receipt-items.get">["items"];
type ReceiptParticipant =
	TRPCQueryOutput<"receipt-items.get">["participants"][number];

type Props = {
	receiptId: ReceiptsId;
	receiptItem: ReceiptItems[number];
	receiptParticipants: ReceiptParticipant[];
	currency?: Currency;
	role: Role;
	isLoading: boolean;
};

export const ReceiptItem: React.FC<Props> = ({
	receiptItem,
	receiptParticipants,
	receiptId,
	currency,
	role,
	isLoading: isReceiptDeleteLoading,
}) => {
	const removeReceiptItemMutation = trpc.useMutation(
		"receipt-items.delete",
		useTrpcMutationOptions(cache.receiptItems.delete.mutationOptions, receiptId)
	);
	const removeItem = useAsyncCallback(
		() =>
			removeReceiptItemMutation.mutateAsync({
				id: receiptItem.id,
			}),
		[removeReceiptItemMutation.mutate, receiptItem.id]
	);

	const addedParticipants = receiptItem.parts.map((part) => part.userId);
	const notAddedParticipants = receiptParticipants.filter(
		(participant) => !addedParticipants.includes(participant.remoteUserId)
	);

	const addItemPartMutation = trpc.useMutation(
		"item-participants.put",
		useTrpcMutationOptions(
			cache.itemParticipants.put.mutationOptions,
			receiptId
		)
	);
	const addParticipant = React.useCallback(
		(participant: ReceiptParticipant) => {
			addItemPartMutation.mutate({
				itemId: receiptItem.id,
				userId: participant.remoteUserId,
			});
		},
		[addItemPartMutation, receiptItem.id]
	);

	const isDeleteLoading =
		isReceiptDeleteLoading || removeReceiptItemMutation.isLoading;

	return (
		<Card>
			<Card.Header css={{ justifyContent: "space-between" }}>
				<ReceiptItemNameInput
					receiptId={receiptId}
					receiptItem={receiptItem}
					role={role}
					isLoading={isDeleteLoading}
				/>
				<ReceiptItemLockedButton
					ghost
					receiptId={receiptId}
					receiptItemId={receiptItem.id}
					locked={receiptItem.locked}
					disabled={role === "viewer"}
				/>
			</Card.Header>
			<Card.Divider />
			<Card.Body>
				<Sum>
					<ReceiptItemPriceInput
						receiptId={receiptId}
						receiptItem={receiptItem}
						currency={currency}
						role={role}
						isLoading={isDeleteLoading}
					/>
					<ReceiptItemQuantityInput
						receiptId={receiptId}
						receiptItem={receiptItem}
						role={role}
						isLoading={isDeleteLoading}
					/>
				</Sum>
				{role === "viewer" ? null : (
					<>
						<Spacer y={1} />
						<ButtonsGroup
							type="linear"
							buttons={notAddedParticipants}
							buttonProps={{ auto: true }}
							extractDetails={(participant) => ({
								id: participant.remoteUserId,
								name: participant.name,
							})}
							onClick={addParticipant}
						/>
					</>
				)}
				{receiptItem.parts.length === 0 ? (
					<>
						<Spacer y={0.5} />
						<Text h4>Add a user from a list above</Text>
					</>
				) : (
					<>
						<Spacer y={1} />
						<Card.Divider />
						<Spacer y={1} />
						{receiptItem.parts.map((part, index) => {
							const matchedParticipant = receiptParticipants.find(
								(participant) => participant.remoteUserId === part.userId
							);
							if (!matchedParticipant) {
								return (
									<React.Fragment key={part.userId}>
										{index === 0 ? null : <Spacer y={0.5} />}
										<ErrorMessage
											message={`Part for user id ${part.userId} is orphaned. Please report this to support, include receipt id, receipt item name and mentioned user id`}
										/>
									</React.Fragment>
								);
							}
							return (
								<React.Fragment key={part.userId}>
									{index === 0 ? null : <Spacer y={0.5} />}
									<ReceiptItemPart
										receiptId={receiptId}
										itemPart={part}
										participant={matchedParticipant}
										receiptItemId={receiptItem.id}
										role={role}
										isLoading={isDeleteLoading}
									/>
								</React.Fragment>
							);
						})}
					</>
				)}
			</Card.Body>
			{role === "viewer" ? null : (
				<>
					<Card.Divider />
					<Card.Footer css={{ justifyContent: "flex-end" }}>
						<RemoveButton
							onRemove={removeItem}
							mutation={removeReceiptItemMutation}
							subtitle="This will remove item with all participant's parts"
						>
							Remove item
						</RemoveButton>
					</Card.Footer>
				</>
			)}
		</Card>
	);
};
