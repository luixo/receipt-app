import React from "react";
import * as ReactNative from "react-native";
import {
	UseContextedMutationOptions,
	useTrpcMutationOptions,
} from "../hooks/use-trpc-mutation-options";
import { trpc, TRPCMutationInput, TRPCQueryOutput } from "../trpc";
import { Block } from "./utils/block";
import { Text } from "../utils/styles";
import { MutationWrapper } from "./utils/mutation-wrapper";
import { ReceiptItemsId } from "next-app/db/models";
import { ReceiptItemsGetInput } from "../utils/queries/receipt-items";
import { useAsyncCallback } from "../hooks/use-async-callback";
import { RemoveButton } from "./utils/remove-button";
import {
	getReceiptItemPartWithIndex,
	updateItemPart,
	updateItemParts,
} from "../utils/queries/item-participants";

type ReceiptItem = TRPCQueryOutput<"receipt-items.get">["items"][number];
type ReceiptParticipant =
	TRPCQueryOutput<"receipt-items.get">["participants"][number];
type ReceiptItemParts = ReceiptItem["parts"];

const deleteMutationOptions: UseContextedMutationOptions<
	"item-participants.delete",
	ReturnType<typeof getReceiptItemPartWithIndex>,
	ReceiptItemsGetInput
> = {
	onMutate: (trpc, input) => (variables) => {
		const snapshot = getReceiptItemPartWithIndex(
			trpc,
			input,
			variables.itemId,
			variables.userId
		);
		updateItemParts(trpc, input, variables.itemId, (participants) =>
			participants.filter((part) => part.userId !== variables.userId)
		);
		return snapshot;
	},
	onError: (trpc, input) => (_error, variables, snapshot) => {
		if (!snapshot) {
			return;
		}
		updateItemParts(trpc, input, variables.itemId, (participants) => [
			...participants.slice(0, snapshot.index),
			snapshot.item,
			...participants.slice(snapshot.index),
		]);
	},
};

const applyUpdate = (
	part: ReceiptItemParts[number],
	update: TRPCMutationInput<"item-participants.update">["update"]
): ReceiptItemParts[number] => {
	switch (update.type) {
		case "part":
			return {
				...part,
				part: update.part,
				dirty: true,
			};
	}
};

const updateMutationOptions: UseContextedMutationOptions<
	"item-participants.update",
	| NonNullable<ReturnType<typeof getReceiptItemPartWithIndex>>["item"]
	| undefined,
	ReceiptItemsGetInput
> = {
	onMutate: (trpc, input) => (variables) => {
		const snapshot = getReceiptItemPartWithIndex(
			trpc,
			input,
			variables.itemId,
			variables.userId
		);
		updateItemPart(
			trpc,
			input,
			variables.itemId,
			variables.userId,
			(participant) => applyUpdate(participant, variables.update)
		);
		return snapshot?.item;
	},
	onSuccess: (trpc, input) => (_error, variables) => {
		updateItemPart(
			trpc,
			input,
			variables.itemId,
			variables.userId,
			(participant) => ({ ...participant, dirty: false })
		);
	},
	onError: (trpc, input) => (_error, variables, snapshotItem) => {
		if (!snapshotItem) {
			return;
		}
		updateItemPart(
			trpc,
			input,
			variables.itemId,
			variables.userId,
			() => snapshotItem
		);
	},
};

type Props = {
	itemId: ReceiptItemsId;
	receiptParticipants: ReceiptParticipant[];
	receiptItemPart: ReceiptItemParts[number];
	receiptItemsInput: ReceiptItemsGetInput;
	role?: TRPCQueryOutput<"receipts.get">["role"];
};

export const ReceiptItemPart: React.FC<Props> = ({
	itemId,
	receiptItemPart,
	receiptParticipants,
	receiptItemsInput,
	role,
}) => {
	const updateItemPartMutation = trpc.useMutation(
		"item-participants.update",
		useTrpcMutationOptions(updateMutationOptions, receiptItemsInput)
	);

	const promptPart = React.useCallback(() => {
		const nextPart = Number(
			window.prompt("Please enter part", receiptItemPart.part.toString())
		);
		if (Number.isNaN(nextPart)) {
			return window.alert("Part should be a number!");
		}
		if (nextPart === receiptItemPart.part) {
			return;
		}
		updateItemPartMutation.mutate({
			itemId,
			userId: receiptItemPart.userId,
			update: { type: "part", part: nextPart },
		});
	}, [
		updateItemPartMutation,
		receiptItemPart.part,
		receiptItemPart.userId,
		itemId,
	]);

	const incrementPart = React.useCallback(() => {
		const nextPart = receiptItemPart.part + 1;
		updateItemPartMutation.mutate({
			itemId,
			userId: receiptItemPart.userId,
			update: { type: "part", part: nextPart },
		});
	}, [
		updateItemPartMutation,
		receiptItemPart.part,
		receiptItemPart.userId,
		itemId,
	]);
	const decrementPart = React.useCallback(() => {
		const nextPart = receiptItemPart.part - 1;
		if (nextPart <= 0) {
			return;
		}
		updateItemPartMutation.mutate({
			itemId,
			userId: receiptItemPart.userId,
			update: { type: "part", part: nextPart },
		});
	}, [
		updateItemPartMutation,
		receiptItemPart.part,
		receiptItemPart.userId,
		itemId,
	]);

	const removeItemPartMutation = trpc.useMutation(
		"item-participants.delete",
		useTrpcMutationOptions(deleteMutationOptions, receiptItemsInput)
	);
	const removeItemPart = useAsyncCallback(
		() =>
			removeItemPartMutation.mutateAsync({
				itemId,
				userId: receiptItemPart.userId,
			}),
		[removeItemPartMutation.mutate, itemId, receiptItemPart.userId]
	);

	const matchedParticipant = receiptParticipants.find(
		(participant) => participant.userId === receiptItemPart.userId
	);
	if (!matchedParticipant) {
		return (
			<Block name="Unknown user">
				<Text>{receiptItemPart.userId} not found</Text>
			</Block>
		);
	}
	return (
		<Block name={matchedParticipant.name}>
			<ReactNative.TouchableOpacity
				disabled={
					receiptItemPart.part <= 1 ||
					!role ||
					role === "viewer" ||
					receiptItemPart.dirty
				}
				onPress={decrementPart}
			>
				<Text>-</Text>
			</ReactNative.TouchableOpacity>
			<ReactNative.TouchableOpacity
				onPress={promptPart}
				disabled={!role || role === "viewer" || receiptItemPart.dirty}
			>
				<Text>{receiptItemPart.part} part(s)</Text>
			</ReactNative.TouchableOpacity>
			<ReactNative.TouchableOpacity
				onPress={incrementPart}
				disabled={!role || role === "viewer" || receiptItemPart.dirty}
			>
				<Text>+</Text>
			</ReactNative.TouchableOpacity>
			{!role || role === "viewer" ? null : (
				<RemoveButton onPress={removeItemPart} disabled={receiptItemPart.dirty}>
					Remove participant
				</RemoveButton>
			)}
			<MutationWrapper<"item-participants.update">
				mutation={updateItemPartMutation}
			>
				{() => <Text>Update success!</Text>}
			</MutationWrapper>
			<MutationWrapper<"item-participants.delete">
				mutation={removeItemPartMutation}
			>
				{() => <Text>Remove success!</Text>}
			</MutationWrapper>
		</Block>
	);
};
