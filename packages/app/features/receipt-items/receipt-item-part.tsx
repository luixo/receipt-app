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
	addReceiptItemPart,
	ReceiptItemsGetInput,
	removeReceiptItemPart,
	updateReceiptItemPart,
} from "app/utils/queries/receipt-items-get";
import { Revert } from "app/utils/queries/utils";
import { Text } from "app/utils/styles";
import { ReceiptItemsId } from "next-app/db/models";

type ReceiptItem = TRPCQueryOutput<"receipt-items.get">["items"][number];
type ReceiptParticipant =
	TRPCQueryOutput<"receipt-items.get">["participants"][number];
type ReceiptItemParts = ReceiptItem["parts"];

const deleteMutationOptions: UseContextedMutationOptions<
	"item-participants.delete",
	ReturnType<typeof removeReceiptItemPart>,
	ReceiptItemsGetInput
> = {
	onMutate: (trpcContext, input) => (variables) =>
		removeReceiptItemPart(
			trpcContext,
			input,
			variables.itemId,
			(part) => part.userId !== variables.userId
		),
	onError: (trpcContext, input) => (_error, variables, snapshot) => {
		if (!snapshot) {
			return;
		}
		addReceiptItemPart(
			trpcContext,
			input,
			variables.itemId,
			snapshot.receiptItemPart,
			snapshot.index
		);
	},
};

const applyUpdate = (
	part: ReceiptItemParts[number],
	update: TRPCMutationInput<"item-participants.update">["update"]
): ReceiptItemParts[number] => {
	switch (update.type) {
		case "part":
			return { ...part, part: update.part };
	}
};

const getRevert =
	(
		snapshot: ReceiptItemParts[number],
		update: TRPCMutationInput<"item-participants.update">["update"]
	): Revert<ReceiptItemParts[number]> =>
	(item) => {
		switch (update.type) {
			case "part":
				return { ...item, part: snapshot.part };
		}
	};

const updateMutationOptions: UseContextedMutationOptions<
	"item-participants.update",
	Revert<ReceiptItemParts[number]> | undefined,
	ReceiptItemsGetInput
> = {
	onMutate: (trpcContext, input) => (variables) => {
		const snapshot = updateReceiptItemPart(
			trpcContext,
			input,
			variables.itemId,
			variables.userId,
			(part) => applyUpdate({ ...part, dirty: true }, variables.update)
		);
		return snapshot && getRevert(snapshot, variables.update);
	},
	onSuccess: (trpcContext, input) => (_error, variables) => {
		updateReceiptItemPart(
			trpcContext,
			input,
			variables.itemId,
			variables.userId,
			(part) => ({ ...part, dirty: false })
		);
	},
	onError: (trpcContext, input) => (_error, variables, revert) => {
		if (!revert) {
			return;
		}
		updateReceiptItemPart(
			trpcContext,
			input,
			variables.itemId,
			variables.userId,
			revert
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
