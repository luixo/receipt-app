import React from "react";

import { Card, Spacer, styled, Text } from "@nextui-org/react";

import { cache } from "app/cache";
import { ReceiptItemLockedButton } from "app/components/app/receipt-item-locked-button";
import { ButtonsGroup } from "app/components/buttons-group";
import { ErrorMessage } from "app/components/error-message";
import { RemoveButton } from "app/components/remove-button";
import { ReceiptItemPart } from "app/features/receipt-item-parts/receipt-item-part";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import { useFormattedCurrency } from "app/hooks/use-formatted-currency";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { Currency } from "app/utils/currency";
import { round } from "app/utils/math";
import { ReceiptsId, UsersId } from "next-app/db/models";
import { Role } from "next-app/handlers/receipts/utils";

import { ReceiptItemNameInput } from "./receipt-item-name-input";
import { ReceiptItemPriceInput } from "./receipt-item-price-input";
import { ReceiptItemQuantityInput } from "./receipt-item-quantity-input";

const Sum = styled("div", { display: "flex", alignItems: "center" });

type ReceiptItems = TRPCQueryOutput<"receiptItems.get">["items"];
type ReceiptParticipant =
	TRPCQueryOutput<"receiptItems.get">["participants"][number];

type EveryParticipantTag = "__ALL__";
const EVERY_PARTICIPANT_TAG: EveryParticipantTag = "__ALL__";

type Props = {
	receiptLocked: boolean;
	receiptId: ReceiptsId;
	receiptItem: ReceiptItems[number];
	receiptParticipants: ReceiptParticipant[];
	currency?: Currency;
	role: Role;
	isLoading: boolean;
};

export const ReceiptItem: React.FC<Props> = ({
	receiptLocked,
	receiptItem,
	receiptParticipants,
	receiptId,
	currency,
	role,
	isLoading: isReceiptDeleteLoading,
}) => {
	const formattedCurrency = useFormattedCurrency(currency);
	const removeReceiptItemMutation = trpc.useMutation(
		"receiptItems.remove",
		useTrpcMutationOptions(cache.receiptItems.remove.mutationOptions, receiptId)
	);
	const removeItem = useAsyncCallback(
		() =>
			removeReceiptItemMutation.mutateAsync({
				id: receiptItem.id,
			}),
		[removeReceiptItemMutation, receiptItem.id]
	);

	const addedParticipants = receiptItem.parts.map((part) => part.userId);
	const notAddedParticipants = receiptParticipants.filter(
		(participant) => !addedParticipants.includes(participant.remoteUserId)
	);

	const addItemPartMutation = trpc.useMutation(
		"itemParticipants.add",
		useTrpcMutationOptions(
			cache.itemParticipants.add.mutationOptions,
			receiptId
		)
	);
	const addParticipant = React.useCallback(
		(participant: ReceiptParticipant | EveryParticipantTag) => {
			if (participant === EVERY_PARTICIPANT_TAG) {
				addItemPartMutation.mutate({
					itemId: receiptItem.id,
					userIds: notAddedParticipants.map(
						({ remoteUserId }) => remoteUserId
					) as [UsersId, ...UsersId[]],
				});
			} else {
				addItemPartMutation.mutate({
					itemId: receiptItem.id,
					userIds: [participant.remoteUserId],
				});
			}
		},
		[addItemPartMutation, notAddedParticipants, receiptItem.id]
	);

	const isDeleteLoading =
		isReceiptDeleteLoading || removeReceiptItemMutation.isLoading;
	const itemParts = receiptItem.parts.reduce(
		(acc, itemPart) => acc + itemPart.part,
		0
	);
	const isEditingDisabled = role === "viewer" || receiptItem.locked;

	return (
		<Card>
			<Card.Header css={{ justifyContent: "space-between" }}>
				<ReceiptItemNameInput
					receiptId={receiptId}
					receiptItem={receiptItem}
					readOnly={isEditingDisabled || receiptLocked}
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
						readOnly={isEditingDisabled || receiptLocked}
						isLoading={isDeleteLoading}
					/>
					<ReceiptItemQuantityInput
						receiptId={receiptId}
						receiptItem={receiptItem}
						readOnly={isEditingDisabled || receiptLocked}
						isLoading={isDeleteLoading}
					/>
					<Spacer x={0.5} />
					<Text>
						= {round(receiptItem.quantity * receiptItem.price)}{" "}
						{formattedCurrency}
					</Text>
				</Sum>
				{receiptLocked ||
				isEditingDisabled ||
				notAddedParticipants.length === 0 ? null : (
					<>
						<Spacer y={1} />
						<ButtonsGroup<ReceiptParticipant | EveryParticipantTag>
							type="linear"
							buttons={
								notAddedParticipants.length === 1
									? notAddedParticipants
									: [EVERY_PARTICIPANT_TAG, ...notAddedParticipants]
							}
							buttonProps={(button) => ({
								auto: true,
								ghost: true,
								...(button === EVERY_PARTICIPANT_TAG
									? { color: "secondary" }
									: undefined),
							})}
							extractDetails={(participant) =>
								participant === EVERY_PARTICIPANT_TAG
									? {
											id: EVERY_PARTICIPANT_TAG,
											name: "Everyone",
									  }
									: {
											id: participant.remoteUserId,
											name: participant.name,
									  }
							}
							onClick={addParticipant}
							disabled={receiptLocked}
						/>
					</>
				)}
				{receiptItem.parts.length === 0 ? (
					notAddedParticipants.length === 0 || receiptLocked ? null : (
						<>
							<Spacer y={0.5} />
							<Card.Divider />
							<Spacer y={0.5} />
							<Text h4>Add a user from a list above</Text>
						</>
					)
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
										itemParts={itemParts}
										participant={matchedParticipant}
										receiptItemId={receiptItem.id}
										readOnly={isEditingDisabled || receiptLocked}
										isLoading={isDeleteLoading}
									/>
								</React.Fragment>
							);
						})}
					</>
				)}
			</Card.Body>
			{isEditingDisabled ? null : (
				<>
					<Card.Divider />
					<Card.Footer css={{ justifyContent: "flex-end" }}>
						<RemoveButton
							onRemove={removeItem}
							disabled={receiptLocked}
							mutation={removeReceiptItemMutation}
							subtitle="This will remove item with all participant's parts"
							noConfirm={receiptItem.parts.length === 0}
						>
							Remove item
						</RemoveButton>
					</Card.Footer>
				</>
			)}
		</Card>
	);
};
