import React from "react";
import * as ReactNative from "react-native";

import { cache, Cache } from "app/cache";
import { Block } from "app/components/block";
import { MutationWrapper } from "app/components/mutation-wrapper";
import { RemoveButton } from "app/components/remove-button";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { Text } from "app/utils/styles";
import { ReceiptItemsId } from "next-app/db/models";

type ReceiptItem = TRPCQueryOutput<"receipt-items.get">["items"][number];
type ReceiptParticipant =
	TRPCQueryOutput<"receipt-items.get">["participants"][number];
type ReceiptItemParts = ReceiptItem["parts"];

type Props = {
	itemId: ReceiptItemsId;
	receiptParticipants: ReceiptParticipant[];
	receiptItemPart: ReceiptItemParts[number];
	receiptItemsInput: Cache.ReceiptItems.Get.Input;
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
		useTrpcMutationOptions(
			cache.itemParticipants.update.mutationOptions,
			receiptItemsInput
		)
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
		useTrpcMutationOptions(
			cache.itemParticipants.delete.mutationOptions,
			receiptItemsInput
		)
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
