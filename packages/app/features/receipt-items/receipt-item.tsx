import React from "react";
import * as ReactNative from "react-native";

import { cache } from "app/cache";
import { Block } from "app/components/block";
import { MutationWrapper } from "app/components/mutation-wrapper";
import { RemoveButton } from "app/components/remove-button";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { Text } from "app/utils/styles";
import { ReceiptsId } from "next-app/db/models";
import { Role } from "next-app/handlers/receipts/utils";

import { AddReceiptItemPartForm } from "./add-receipt-item-part-form";
import { ReceiptItemPart } from "./receipt-item-part";

type ReceiptItems = TRPCQueryOutput<"receipt-items.get">["items"];
type ReceiptParticipant =
	TRPCQueryOutput<"receipt-items.get">["participants"][number];

type Props = {
	receiptId: ReceiptsId;
	receiptItem: ReceiptItems[number];
	receiptParticipants: ReceiptParticipant[];
	role: Role;
};

export const ReceiptItem: React.FC<Props> = ({
	receiptItem,
	receiptParticipants,
	receiptId,
	role,
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

	const updateReceiptItemMutation = trpc.useMutation(
		"receipt-items.update",
		useTrpcMutationOptions(cache.receiptItems.update.mutationOptions, receiptId)
	);
	const promptName = React.useCallback(() => {
		const name = window.prompt("Please enter new name", receiptItem.name);
		if (!name) {
			return;
		}
		if (name === receiptItem.name) {
			return;
		}
		updateReceiptItemMutation.mutate({
			id: receiptItem.id,
			update: { type: "name", name },
		});
	}, [updateReceiptItemMutation, receiptItem.id, receiptItem.name]);
	const promptPrice = React.useCallback(() => {
		const rawPrice = window.prompt(
			"Please enter price",
			receiptItem.price.toString()
		);
		const price = Number(rawPrice);
		if (Number.isNaN(price)) {
			return window.alert("Price should be a number!");
		}
		if (price <= 0) {
			return window.alert("Price should be a positive number!");
		}
		if (price === receiptItem.price) {
			return;
		}
		updateReceiptItemMutation.mutate({
			id: receiptItem.id,
			update: { type: "price", price },
		});
	}, [updateReceiptItemMutation, receiptItem.id, receiptItem.price]);
	const promptQuantity = React.useCallback(() => {
		const rawQuantity = window.prompt(
			"Please enter quantity",
			receiptItem.quantity.toString()
		);
		if (!rawQuantity) {
			return;
		}
		const quantity = Number(rawQuantity);
		if (Number.isNaN(quantity)) {
			return window.alert("Quantity should be a number!");
		}
		if (quantity <= 0) {
			return window.alert("Quantity should be a positive number!");
		}
		if (quantity === receiptItem.quantity) {
			return;
		}
		updateReceiptItemMutation.mutate({
			id: receiptItem.id,
			update: { type: "quantity", quantity },
		});
	}, [updateReceiptItemMutation, receiptItem.id, receiptItem.quantity]);
	const switchLocked = React.useCallback(() => {
		updateReceiptItemMutation.mutate({
			id: receiptItem.id,
			update: { type: "locked", locked: !receiptItem.locked },
		});
	}, [updateReceiptItemMutation, receiptItem.id, receiptItem.locked]);

	const addedParticipants = receiptItem.parts.map((part) => part.userId);
	const notAddedParticipants = receiptParticipants.filter(
		(participant) => !addedParticipants.includes(participant.userId)
	);

	return (
		<Block
			name={receiptItem.name}
			disabled={role === "viewer" || receiptItem.dirty}
			onNamePress={promptName}
		>
			<Text>
				<ReactNative.TouchableOpacity
					disabled={role === "viewer" || receiptItem.dirty}
					onPress={promptPrice}
				>
					<Text>{receiptItem.price}</Text>
				</ReactNative.TouchableOpacity>
				{" x "}
				<ReactNative.TouchableOpacity
					disabled={role === "viewer" || receiptItem.dirty}
					onPress={promptQuantity}
				>
					<Text>{receiptItem.quantity}</Text>
				</ReactNative.TouchableOpacity>
			</Text>
			<ReactNative.TouchableOpacity
				disabled={role === "viewer" || receiptItem.dirty}
				onPress={switchLocked}
			>
				<Text>{receiptItem.locked ? "locked" : "not locked"}</Text>
			</ReactNative.TouchableOpacity>
			{role === "viewer" ? null : (
				<RemoveButton
					onRemove={removeItem}
					mutation={removeReceiptItemMutation}
				>
					Remove item
				</RemoveButton>
			)}
			{receiptItem.parts.map((part) => (
				<ReceiptItemPart
					key={part.userId}
					receiptId={receiptId}
					receiptItemPart={part}
					receiptParticipants={receiptParticipants}
					itemId={receiptItem.id}
					role={role}
				/>
			))}
			{notAddedParticipants.map((participant) => (
				<AddReceiptItemPartForm
					key={participant.userId}
					receiptId={receiptId}
					participant={participant}
					itemId={receiptItem.id}
					role={role}
				/>
			))}
			<MutationWrapper<"receipt-items.update">
				mutation={updateReceiptItemMutation}
			>
				{() => <Text>Update success!</Text>}
			</MutationWrapper>
		</Block>
	);
};
