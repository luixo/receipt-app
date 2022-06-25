import React from "react";
import * as ReactNative from "react-native";
import { UseContextedMutationOptions } from "../hooks/use-trpc-mutation-options";
import { trpc, TRPCMutationInput, TRPCQueryOutput } from "../trpc";
import { Block } from "./utils/block";
import { Text } from "../utils/styles";
import { MutationWrapper } from "./utils/mutation-wrapper";
import { useTrpcMutationOptions } from "../hooks/use-trpc-mutation-options";
import { ReceiptItemsId, UsersId } from "next-app/db/models";
import {
	getReceiptItemWithIndexById,
	ReceiptItemsGetInput,
	updateReceiptItems,
} from "../utils/queries/receipt-items";

type ReceiptItem = TRPCQueryOutput<"receipt-items.get">["items"][number];
type ReceiptParticipant =
	TRPCQueryOutput<"receipt-items.get">["participants"][number];
type ReceiptItemPart = ReceiptItem["parts"][number];

const applyUpdate = (
	item: ReceiptItem,
	update: TRPCMutationInput<"item-participants.update">["update"],
	userId: UsersId
): ReceiptItem => {
	switch (update.type) {
		case "part":
			const userPartIndex = item.parts.findIndex(
				(part) => part.userId === userId
			);
			if (userPartIndex !== -1) {
				return {
					...item,
					parts: [
						...item.parts.slice(0, userPartIndex),
						{ ...item.parts[userPartIndex]!, part: update.part },
						...item.parts.slice(userPartIndex + 1),
					],
				};
			}
			return { ...item, parts: [...item.parts, { userId, part: update.part }] };
	}
};

const updateMutationOptions: UseContextedMutationOptions<
	"item-participants.update",
	| NonNullable<ReturnType<typeof getReceiptItemWithIndexById>>["item"]
	| undefined,
	ReceiptItemsGetInput
> = {
	onMutate: (trpc, input) => (updateObject) => {
		const snapshot = getReceiptItemWithIndexById(
			trpc,
			input,
			updateObject.itemId
		);
		updateReceiptItems(trpc, input, (items) =>
			items.map((item) =>
				item === snapshot?.item
					? applyUpdate(item, updateObject.update, updateObject.userId)
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
	itemId: ReceiptItemsId;
	receiptParticipants: ReceiptParticipant[];
	receiptItemPart: ReceiptItemPart;
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
	const updateItemParticipantMutation = trpc.useMutation(
		"item-participants.update",
		useTrpcMutationOptions(updateMutationOptions, receiptItemsInput)
	);

	const promptPart = React.useCallback(() => {
		const nextPart = Number(
			window.prompt("Please enter part", receiptItemPart.part.toString())
		);
		if (isNaN(nextPart)) {
			return window.alert("Part should be a number!");
		}
		if (nextPart === receiptItemPart.part) {
			return;
		}
		updateItemParticipantMutation.mutate({
			itemId,
			userId: receiptItemPart.userId,
			update: { type: "part", part: nextPart },
		});
	}, [
		updateItemParticipantMutation,
		receiptItemPart.part,
		receiptItemPart.userId,
		itemId,
	]);

	const incrementPart = React.useCallback(() => {
		const nextPart = receiptItemPart.part + 1;
		updateItemParticipantMutation.mutate({
			itemId,
			userId: receiptItemPart.userId,
			update: { type: "part", part: nextPart },
		});
	}, [
		updateItemParticipantMutation,
		receiptItemPart.part,
		receiptItemPart.userId,
		itemId,
	]);
	const decrementPart = React.useCallback(() => {
		const nextPart = receiptItemPart.part - 1;
		if (nextPart <= 0) {
			return;
		}
		updateItemParticipantMutation.mutate({
			itemId,
			userId: receiptItemPart.userId,
			update: { type: "part", part: nextPart },
		});
	}, [
		updateItemParticipantMutation,
		receiptItemPart.part,
		receiptItemPart.userId,
		itemId,
	]);

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
				disabled={receiptItemPart.part <= 1 || !role || role === "viewer"}
				onPress={decrementPart}
			>
				<Text>-</Text>
			</ReactNative.TouchableOpacity>
			<ReactNative.TouchableOpacity
				onPress={promptPart}
				disabled={!role || role === "viewer"}
			>
				<Text>{receiptItemPart.part} part(s)</Text>
			</ReactNative.TouchableOpacity>
			<ReactNative.TouchableOpacity
				onPress={incrementPart}
				disabled={!role || role === "viewer"}
			>
				<Text>+</Text>
			</ReactNative.TouchableOpacity>
			<MutationWrapper<"item-participants.update">
				mutation={updateItemParticipantMutation}
			>
				{() => <Text>Update success!</Text>}
			</MutationWrapper>
		</Block>
	);
};
