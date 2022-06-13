import React from "react";
import * as ReactNative from "react-native";
import { trpc, TRPCMutationInput, TRPCQueryOutput } from "../trpc";
import { Block } from "./utils/block";
import { ReceiptItemPart } from "./receipt-item-part";
import {
	UseContextedMutationOptions,
	useTrpcMutationOptions,
} from "../hooks/use-trpc-mutation-options";
import {
	getReceiptItemWithIndexById,
	ReceiptItemsGetInput,
	updateReceiptItems,
} from "../utils/queries/receipt-items";
import { RemoveButton } from "./utils/remove-button";
import { MutationWrapper } from "./utils/mutation-wrapper";
import { Text } from "../utils/styles";
import { useAsyncCallback } from "../hooks/use-async-callback";
import { VALIDATIONS_CONSTANTS } from "../utils/validation";

type ReceiptItem = TRPCQueryOutput<"receipt-items.get">["items"][number];
type ReceiptParticipant =
	TRPCQueryOutput<"receipt-items.get">["participants"][number];

const deleteMutationOptions: UseContextedMutationOptions<
	"receipt-items.delete",
	ReturnType<typeof getReceiptItemWithIndexById>,
	ReceiptItemsGetInput
> = {
	onMutate:
		(trpc, input) =>
		({ id: removedId }) => {
			const removedItem = getReceiptItemWithIndexById(trpc, input, removedId);
			updateReceiptItems(trpc, input, (items) =>
				items.filter((item) => item.id !== removedId)
			);
			return removedItem;
		},
	onError: (trpc, input) => (_error, _variables, removedItem) => {
		if (!removedItem) {
			return;
		}
		updateReceiptItems(trpc, input, (items) => [
			...items.slice(0, removedItem.index),
			removedItem.item,
			...items.slice(removedItem.index),
		]);
	},
};

const applyUpdate = (
	item: ReceiptItem,
	update: TRPCMutationInput<"receipt-items.update">["update"]
): ReceiptItem => {
	switch (update.type) {
		case "name":
			return { ...item, name: update.name };
		case "price":
			return { ...item, price: update.price };
		case "quantity":
			return { ...item, quantity: update.quantity };
		case "locked":
			return { ...item, locked: update.locked };
	}
};

const updateMutationOptions: UseContextedMutationOptions<
	"receipt-items.update",
	| NonNullable<ReturnType<typeof getReceiptItemWithIndexById>>["item"]
	| undefined,
	ReceiptItemsGetInput
> = {
	onMutate: (trpc, input) => (updateObject) => {
		const snapshot = getReceiptItemWithIndexById(trpc, input, updateObject.id);
		updateReceiptItems(trpc, input, (items) =>
			items.map((item) =>
				item.id === updateObject.id
					? applyUpdate(item, updateObject.update)
					: item
			)
		);
		return snapshot?.item;
	},
	onError: (trpc, input) => (_error, _variables, snapshotItem) => {
		if (!snapshotItem) {
			return;
		}
		updateReceiptItems(trpc, input, (items) =>
			items.map((item) => (item.id === snapshotItem.id ? snapshotItem : item))
		);
	},
};

type Props = {
	receiptItem: ReceiptItem;
	receiptParticipants: ReceiptParticipant[];
	receiptItemsInput: ReceiptItemsGetInput;
	role?: TRPCQueryOutput<"receipts.get">["role"];
};

export const ReceiptItem: React.FC<Props> = ({
	receiptItem,
	receiptParticipants,
	receiptItemsInput,
	role,
}) => {
	const removeReceiptItemMutation = trpc.useMutation(
		"receipt-items.delete",
		useTrpcMutationOptions(deleteMutationOptions, receiptItemsInput)
	);
	const removeReceiptItem = useAsyncCallback(
		() =>
			removeReceiptItemMutation.mutateAsync({
				id: receiptItem.id,
			}),
		[removeReceiptItemMutation.mutate, receiptItem.id]
	);

	const updateReceiptItemMutation = trpc.useMutation(
		"receipt-items.update",
		useTrpcMutationOptions(updateMutationOptions, receiptItemsInput)
	);
	const promptName = React.useCallback(() => {
		const name = window.prompt("Please enter new name", receiptItem.name);
		if (!name) {
			return;
		}
		if (
			name.length < VALIDATIONS_CONSTANTS.receiptItemName.min ||
			name.length > VALIDATIONS_CONSTANTS.receiptItemName.max
		) {
			return window.alert(
				`Name length should be between ${VALIDATIONS_CONSTANTS.receiptItemName.min} and ${VALIDATIONS_CONSTANTS.receiptItemName.max}!`
			);
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
		if (isNaN(price)) {
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
		if (isNaN(quantity)) {
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

	return (
		<Block
			name={receiptItem.name}
			disabled={role === "viewer"}
			onPress={promptName}
		>
			<Text>
				<ReactNative.TouchableOpacity
					disabled={role === "viewer"}
					onPress={promptPrice}
				>
					<Text>{receiptItem.price}</Text>
				</ReactNative.TouchableOpacity>
				{" x "}
				<ReactNative.TouchableOpacity
					disabled={role === "viewer"}
					onPress={promptQuantity}
				>
					<Text>{receiptItem.quantity}</Text>
				</ReactNative.TouchableOpacity>
			</Text>
			<ReactNative.TouchableOpacity
				disabled={role === "viewer"}
				onPress={switchLocked}
			>
				<Text>{receiptItem.locked ? "locked" : "not locked"}</Text>
			</ReactNative.TouchableOpacity>
			{!role || role === "viewer" ? null : (
				<RemoveButton onPress={removeReceiptItem}>Remove item</RemoveButton>
			)}
			{receiptItem.parts.map((part) => (
				<ReceiptItemPart
					key={part.userId}
					receiptItemPart={part}
					receiptParticipants={receiptParticipants}
				/>
			))}
			<MutationWrapper<"receipt-items.delete">
				mutation={removeReceiptItemMutation}
			>
				{() => <Text>Delete success!</Text>}
			</MutationWrapper>
			<MutationWrapper<"receipt-items.update">
				mutation={updateReceiptItemMutation}
			>
				{() => <Text>Update success!</Text>}
			</MutationWrapper>
		</Block>
	);
};
