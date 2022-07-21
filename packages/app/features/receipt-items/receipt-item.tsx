import React from "react";
import * as ReactNative from "react-native";

import { Block } from "app/components/block";
import { MutationWrapper } from "app/components/mutation-wrapper";
import { RemoveButton } from "app/components/remove-button";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import {
	UseContextedMutationOptions,
	useTrpcMutationOptions,
} from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCMutationInput, TRPCQueryOutput } from "app/trpc";
import {
	getReceiptItemWithIndexById,
	ReceiptItemsGetInput,
	updateReceiptItems,
} from "app/utils/queries/receipt-items";
import { updateReceiptSum } from "app/utils/receipt";
import { Text } from "app/utils/styles";

import { AddReceiptItemPartForm } from "./add-receipt-item-part-form";
import { ReceiptItemPart } from "./receipt-item-part";

type ReceiptItems = TRPCQueryOutput<"receipt-items.get">["items"];
type ReceiptParticipant =
	TRPCQueryOutput<"receipt-items.get">["participants"][number];

const deleteMutationOptions: UseContextedMutationOptions<
	"receipt-items.delete",
	ReturnType<typeof getReceiptItemWithIndexById>,
	ReceiptItemsGetInput
> = {
	onMutate:
		(trpcContext, input) =>
		({ id: removedId }) => {
			const removedItem = getReceiptItemWithIndexById(
				trpcContext,
				input,
				removedId
			);
			updateReceiptItems(trpcContext, input, (items) =>
				items.filter((item) => item.id !== removedId)
			);
			return removedItem;
		},
	onError: (trpcContext, input) => (_error, _variables, removedItem) => {
		if (!removedItem) {
			return;
		}
		updateReceiptItems(trpcContext, input, (items) => [
			...items.slice(0, removedItem.index),
			removedItem.item,
			...items.slice(removedItem.index),
		]);
	},
	onSuccess: (trpcContext, input) => () => {
		updateReceiptSum(trpcContext, input);
	},
};

const applyUpdate = (
	item: ReceiptItems[number],
	update: TRPCMutationInput<"receipt-items.update">["update"]
): ReceiptItems[number] => {
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
	onMutate: (trpcContext, input) => (updateObject) => {
		const snapshot = getReceiptItemWithIndexById(
			trpcContext,
			input,
			updateObject.id
		);
		updateReceiptItems(trpcContext, input, (items) =>
			items.map((item) =>
				item.id === updateObject.id
					? applyUpdate({ ...item, dirty: true }, updateObject.update)
					: item
			)
		);
		return snapshot?.item;
	},
	onSuccess: (trpcContext, input) => (_value, updateObject) => {
		updateReceiptItems(trpcContext, input, (items) =>
			items.map((item) =>
				item.id === updateObject.id ? { ...item, dirty: false } : item
			)
		);
		if (
			updateObject.update.type === "price" ||
			updateObject.update.type === "quantity"
		) {
			updateReceiptSum(trpcContext, input);
		}
	},
	onError: (trpcContext, input) => (_error, _variables, snapshotItem) => {
		if (!snapshotItem) {
			return;
		}
		updateReceiptItems(trpcContext, input, (items) =>
			items.map((item) => (item.id === snapshotItem.id ? snapshotItem : item))
		);
	},
};

type Props = {
	receiptItem: ReceiptItems[number];
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
			{!role || role === "viewer" ? null : (
				<RemoveButton onPress={removeReceiptItem} disabled={receiptItem.dirty}>
					Remove item
				</RemoveButton>
			)}
			{receiptItem.parts.map((part) => (
				<ReceiptItemPart
					key={part.userId}
					receiptItemPart={part}
					receiptParticipants={receiptParticipants}
					itemId={receiptItem.id}
					receiptItemsInput={receiptItemsInput}
					role={role}
				/>
			))}
			{notAddedParticipants.map((participant) => (
				<AddReceiptItemPartForm
					key={participant.userId}
					participant={participant}
					receiptItemsInput={receiptItemsInput}
					itemId={receiptItem.id}
					role={role}
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
