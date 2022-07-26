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
import { ReceiptItemsId, ReceiptsId } from "next-app/db/models";
import { Role } from "next-app/handlers/receipts/utils";

type ReceiptItem = TRPCQueryOutput<"receipt-items.get">["items"][number];
type ReceiptParticipant =
	TRPCQueryOutput<"receipt-items.get">["participants"][number];
type ReceiptItemParts = ReceiptItem["parts"];

type Props = {
	receiptId: ReceiptsId;
	itemId: ReceiptItemsId;
	receiptParticipants: ReceiptParticipant[];
	receiptItemPart: ReceiptItemParts[number];
	role: Role;
	isLoading: boolean;
};

export const ReceiptItemPart: React.FC<Props> = ({
	itemId,
	receiptItemPart,
	receiptParticipants,
	receiptId,
	role,
	isLoading,
}) => {
	const updateItemPartMutation = trpc.useMutation(
		"item-participants.update",
		useTrpcMutationOptions(
			cache.itemParticipants.update.mutationOptions,
			receiptId
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
			receiptId
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
				disabled={receiptItemPart.part <= 1 || role === "viewer" || isLoading}
				onPress={decrementPart}
			>
				<Text>-</Text>
			</ReactNative.TouchableOpacity>
			<ReactNative.TouchableOpacity
				onPress={promptPart}
				disabled={role === "viewer" || isLoading}
			>
				<Text>{receiptItemPart.part} part(s)</Text>
			</ReactNative.TouchableOpacity>
			<ReactNative.TouchableOpacity
				onPress={incrementPart}
				disabled={role === "viewer" || isLoading}
			>
				<Text>+</Text>
			</ReactNative.TouchableOpacity>
			{role === "viewer" ? null : (
				<RemoveButton
					onRemove={removeItemPart}
					mutation={removeItemPartMutation}
				>
					Remove participant
				</RemoveButton>
			)}
			<MutationWrapper<"item-participants.update">
				mutation={updateItemPartMutation}
			>
				{() => <Text>Update success!</Text>}
			</MutationWrapper>
		</Block>
	);
};
