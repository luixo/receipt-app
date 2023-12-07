import React from "react";
import { View } from "react-native";

import { styled } from "@nextui-org/react";
import {
	Card,
	CardBody,
	CardFooter,
	CardHeader,
	Chip,
	Divider,
	Spacer,
} from "@nextui-org/react-tailwind";

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
			(participant) => !addedParticipants.includes(participant.remoteUserId),
		);

		const addItemPartMutation = trpc.itemParticipants.add.useMutation(
			useTrpcMutationOptions(mutations.itemParticipants.add.options, {
				context: receiptId,
			}),
		);
		const addParticipant = React.useCallback(
			(participant: ReceiptParticipant | EveryParticipantTag) => () => {
				if (participant === EVERY_PARTICIPANT_TAG) {
					addItemPartMutation.mutate({
						itemId: receiptItem.id,
						userIds: notAddedParticipants.map(
							({ remoteUserId }) => remoteUserId,
						) as [UsersId, ...UsersId[]],
					});
				} else {
					addItemPartMutation.mutate({
						itemId: receiptItem.id,
						userIds: [participant.remoteUserId],
					});
				}
			},
			[addItemPartMutation, notAddedParticipants, receiptItem.id],
		);

		const isDeleteLoading =
			isReceiptDeleteLoading || removeReceiptItemMutation.isLoading;
		const itemParts = receiptItem.parts.reduce(
			(acc, itemPart) => acc + itemPart.part,
			0,
		);
		const isEditingDisabled = role === "viewer" || receiptItem.locked;

		return (
			<Card ref={ref}>
				<CardHeader className="justify-between">
					<ReceiptItemNameInput
						receiptId={receiptId}
						receiptItem={receiptItem}
						readOnly={isEditingDisabled || receiptLocked}
						isLoading={isDeleteLoading}
					/>
					<Spacer x={4} />
					<ReceiptItemLockedButton
						receiptId={receiptId}
						receiptItemId={receiptItem.id}
						locked={receiptItem.locked}
						isDisabled={role === "viewer"}
					/>
				</CardHeader>
				<Divider />
				<CardBody>
					<Sum>
						<ReceiptItemPriceInput
							receiptId={receiptId}
							receiptItem={receiptItem}
							currencyCode={currencyCode}
							readOnly={isEditingDisabled || receiptLocked}
							isLoading={isDeleteLoading}
						/>
						<Spacer x={2} />
						<ReceiptItemQuantityInput
							receiptId={receiptId}
							receiptItem={receiptItem}
							readOnly={isEditingDisabled || receiptLocked}
							isLoading={isDeleteLoading}
						/>
						<Spacer x={2} />
						<Text>
							= {round(receiptItem.quantity * receiptItem.price)} {currency}
						</Text>
					</Sum>
					{receiptLocked ||
					isEditingDisabled ||
					notAddedParticipants.length === 0 ? null : (
						<>
							<Spacer y={4} />
							<View className="flex-row">
								{(notAddedParticipants.length === 1
									? notAddedParticipants
									: [EVERY_PARTICIPANT_TAG, ...notAddedParticipants]
								).map((participant, index) => (
									<React.Fragment
										key={
											participant === EVERY_PARTICIPANT_TAG
												? participant
												: participant.remoteUserId
										}
									>
										{index === 0 ? null : <Spacer x={1} />}
										<Chip
											color={
												participant === EVERY_PARTICIPANT_TAG
													? "secondary"
													: "default"
											}
											className="cursor-pointer"
											onClick={addParticipant(participant)}
											isDisabled={receiptLocked}
										>
											{participant === EVERY_PARTICIPANT_TAG
												? "Everyone"
												: `+ ${participant.name}`}
										</Chip>
									</React.Fragment>
								))}
							</View>
						</>
					)}
					{receiptItem.parts.length === 0 ? (
						notAddedParticipants.length === 0 || receiptLocked ? null : (
							<>
								<Spacer y={4} />
								<Divider />
								<Spacer y={2} />
								<Text className="text-lg">Add a user from a list above</Text>
							</>
						)
					) : (
						<>
							<Spacer y={4} />
							<Divider />
							<Spacer y={2} />
							{receiptItem.parts.map((part, index) => {
								const matchedParticipant = receiptParticipants.find(
									(participant) => participant.remoteUserId === part.userId,
								);
								if (!matchedParticipant) {
									return (
										<React.Fragment key={part.userId}>
											{index === 0 ? null : <Spacer y={2} />}
											<ErrorMessage
												message={`Part for user id ${part.userId} is orphaned. Please report this to support, include receipt id, receipt item name and mentioned user id`}
											/>
										</React.Fragment>
									);
								}
								return (
									<React.Fragment key={part.userId}>
										{index === 0 ? null : <Spacer y={2} />}
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
				</CardBody>
				{isEditingDisabled ? null : (
					<>
						<Divider />
						<CardFooter className="justify-end">
							<RemoveButton
								onRemove={removeItem}
								isDisabled={receiptLocked}
								mutation={removeReceiptItemMutation}
								subtitle="This will remove item with all participant's parts"
								noConfirm={receiptItem.parts.length === 0}
							>
								Remove item
							</RemoveButton>
						</CardFooter>
					</>
				)}
			</Card>
		);
	},
);
