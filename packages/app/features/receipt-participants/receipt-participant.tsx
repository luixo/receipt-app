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
import { Currency } from "app/utils/currency";
import { ReceiptItemsGetInput } from "app/utils/queries/receipt-items";
import {
	getReceiptParticipantWithIndexById,
	updateReceiptParticipants,
} from "app/utils/queries/receipt-participants";
import { Text } from "app/utils/styles";

import {
	AssignableRole,
	ReceiptParticipantRoleChange,
} from "./receipt-participant-role-change";

type ReceiptParticipants = TRPCQueryOutput<"receipt-items.get">["participants"];

const deleteMutationOptions: UseContextedMutationOptions<
	"receipt-participants.delete",
	ReturnType<typeof getReceiptParticipantWithIndexById>,
	ReceiptItemsGetInput
> = {
	onMutate:
		(trpcContext, input) =>
		({ userId }) => {
			const removedReceiptParticipant = getReceiptParticipantWithIndexById(
				trpcContext,
				input,
				userId
			);
			updateReceiptParticipants(trpcContext, input, (participants) =>
				participants.filter((participant) => participant.userId !== userId)
			);
			return removedReceiptParticipant;
		},
	onError:
		(trpcContext, input) => (_error, _variables, removedReceiptParticipant) => {
			if (!removedReceiptParticipant) {
				return;
			}
			updateReceiptParticipants(trpcContext, input, (participants) => [
				...participants.slice(0, removedReceiptParticipant.index),
				removedReceiptParticipant.item,
				...participants.slice(removedReceiptParticipant.index),
			]);
		},
};

const applyUpdate = (
	item: ReceiptParticipants[number],
	update: TRPCMutationInput<"receipt-participants.update">["update"]
): ReceiptParticipants[number] => {
	switch (update.type) {
		case "role":
			return { ...item, role: update.role };
		case "resolved":
			return { ...item, resolved: update.resolved };
	}
};

const updateMutationOptions: UseContextedMutationOptions<
	"receipt-participants.update",
	| NonNullable<ReturnType<typeof getReceiptParticipantWithIndexById>>["item"]
	| undefined,
	ReceiptItemsGetInput
> = {
	onMutate: (trpcContext, input) => (updateObject) => {
		const snapshot = getReceiptParticipantWithIndexById(
			trpcContext,
			input,
			updateObject.userId
		);
		updateReceiptParticipants(trpcContext, input, (items) =>
			items.map((item) =>
				item.userId === updateObject.userId
					? applyUpdate({ ...item, dirty: true }, updateObject.update)
					: item
			)
		);
		return snapshot?.item;
	},
	onSuccess: (trpcContext, input) => (_result, updateObject) => {
		updateReceiptParticipants(trpcContext, input, (items) =>
			items.map((item) =>
				item.userId === updateObject.userId ? { ...item, dirty: false } : item
			)
		);
	},
	onError: (trpcContext, input) => (_error, _variables, snapshot) => {
		if (!snapshot) {
			return;
		}
		updateReceiptParticipants(trpcContext, input, (items) =>
			items.map((item) => (item.userId === snapshot.userId ? snapshot : item))
		);
	},
};

type Props = {
	receiptParticipant: TRPCQueryOutput<"receipt-items.get">["participants"][number] & {
		sum: number;
	};
	receiptItemsInput: ReceiptItemsGetInput;
	role?: TRPCQueryOutput<"receipts.get">["role"];
	currency?: Currency;
};

export const ReceiptParticipant: React.FC<Props> = ({
	receiptParticipant,
	receiptItemsInput,
	role,
	currency,
}) => {
	const accountQuery = trpc.useQuery(["account.get"]);

	const deleteReceiptParticipantMutation = trpc.useMutation(
		"receipt-participants.delete",
		useTrpcMutationOptions(deleteMutationOptions, receiptItemsInput)
	);
	const deleteReceiptParticipant = useAsyncCallback(
		() =>
			deleteReceiptParticipantMutation.mutateAsync({
				receiptId: receiptItemsInput.receiptId,
				userId: receiptParticipant.userId,
			}),
		[
			deleteReceiptParticipantMutation,
			receiptItemsInput.receiptId,
			receiptParticipant.userId,
		]
	);

	const [rolePickerShown, setRolePickerShown] = React.useState(false);
	const showRolePicker = React.useCallback(
		() => setRolePickerShown(true),
		[setRolePickerShown]
	);
	const hideRolePicker = React.useCallback(
		() => setRolePickerShown(false),
		[setRolePickerShown]
	);

	const updateReceiptMutation = trpc.useMutation(
		"receipt-participants.update",
		useTrpcMutationOptions(updateMutationOptions, receiptItemsInput)
	);
	const changeRole = React.useCallback(
		(assignableRole: AssignableRole) => {
			updateReceiptMutation.mutate({
				receiptId: receiptItemsInput.receiptId,
				userId: receiptParticipant.userId,
				update: { type: "role", role: assignableRole },
			});
		},
		[
			updateReceiptMutation,
			receiptItemsInput.receiptId,
			receiptParticipant.userId,
		]
	);
	const switchResolved = React.useCallback(() => {
		updateReceiptMutation.mutate({
			receiptId: receiptItemsInput.receiptId,
			userId: receiptParticipant.userId,
			update: { type: "resolved", resolved: !receiptParticipant.resolved },
		});
	}, [
		updateReceiptMutation,
		receiptItemsInput.receiptId,
		receiptParticipant.userId,
		receiptParticipant.resolved,
	]);

	return (
		<Block name={`User ${receiptParticipant.name}`}>
			<ReactNative.TouchableOpacity
				disabled={role !== "owner" || receiptParticipant.role === "owner"}
				onPress={showRolePicker}
			>
				<Text>Role: {receiptParticipant.role}</Text>
			</ReactNative.TouchableOpacity>
			{rolePickerShown && receiptParticipant.role !== "owner" ? (
				<ReceiptParticipantRoleChange
					close={hideRolePicker}
					changeRole={changeRole}
					initialRole={receiptParticipant.role}
					disabled={receiptParticipant.dirty}
				/>
			) : null}
			<ReactNative.TouchableOpacity
				disabled={
					accountQuery.status !== "success" ||
					receiptParticipant.localUserId !== accountQuery.data.id ||
					receiptParticipant.dirty
				}
				onPress={switchResolved}
			>
				<Text>{receiptParticipant.resolved ? "resolved" : "not resolved"}</Text>
			</ReactNative.TouchableOpacity>
			<Text>
				Sum: {Math.round(receiptParticipant.sum * 100) / 100}
				{currency ? ` ${currency}` : ""}
			</Text>
			{role && role === "owner" ? (
				<>
					<RemoveButton
						onPress={deleteReceiptParticipant}
						disabled={receiptParticipant.dirty}
					>
						Delete receipt participant
					</RemoveButton>
					<MutationWrapper<"receipt-participants.delete">
						mutation={deleteReceiptParticipantMutation}
					>
						{() => <Text>Delete success!</Text>}
					</MutationWrapper>
				</>
			) : null}
		</Block>
	);
};
