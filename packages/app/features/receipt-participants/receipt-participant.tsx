import React from "react";
import * as ReactNative from "react-native";

import { cache, Cache, Revert } from "app/cache";
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
import { Text } from "app/utils/styles";

import {
	AssignableRole,
	ReceiptParticipantRoleChange,
} from "./receipt-participant-role-change";

type ReceiptParticipants = TRPCQueryOutput<"receipt-items.get">["participants"];

const deleteMutationOptions: UseContextedMutationOptions<
	"receipt-participants.delete",
	ReturnType<
		typeof cache["receiptItems"]["get"]["receiptParticipant"]["remove"]
	>,
	{
		itemsInput: Cache.ReceiptItems.Get.Input;
		usersInput: Cache.Users.GetAvailable.Input;
		user: Cache.Users.GetAvailable.User;
	}
> = {
	onMutate:
		(trpcContext, { itemsInput }) =>
		({ userId }) =>
			cache.receiptItems.get.receiptParticipant.remove(
				trpcContext,
				itemsInput,
				(participant) => participant.userId === userId
			),
	onError:
		(trpcContext, { itemsInput, usersInput, user }) =>
		(_error, _variables, snapshot) => {
			if (!snapshot) {
				return;
			}
			cache.receiptItems.get.receiptParticipant.add(
				trpcContext,
				itemsInput,
				snapshot.receiptParticipant,
				snapshot.index
			);
			cache.users.getAvailable.add(trpcContext, usersInput, user);
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

const getRevert =
	(
		snapshot: ReceiptParticipants[number],
		update: TRPCMutationInput<"receipt-participants.update">["update"]
	): Revert<ReceiptParticipants[number]> =>
	(item) => {
		switch (update.type) {
			case "role":
				return { ...item, role: snapshot.role };
			case "resolved":
				return { ...item, resolved: snapshot.resolved };
		}
	};

const updateMutationOptions: UseContextedMutationOptions<
	"receipt-participants.update",
	Revert<ReceiptParticipants[number]> | undefined,
	Cache.ReceiptItems.Get.Input
> = {
	onMutate: (trpcContext, input) => (variables) => {
		const snapshot = cache.receiptItems.get.receiptParticipant.update(
			trpcContext,
			input,
			variables.userId,
			(participant) =>
				applyUpdate({ ...participant, dirty: true }, variables.update)
		);
		return snapshot && getRevert(snapshot, variables.update);
	},
	onSuccess: (trpcContext, input) => (_result, variables) => {
		cache.receiptItems.get.receiptParticipant.update(
			trpcContext,
			input,
			variables.userId,
			(participant) => ({
				...participant,
				dirty: false,
			})
		);
	},
	onError: (trpcContext, input) => (_error, variables, revert) => {
		if (!revert) {
			return;
		}
		cache.receiptItems.get.receiptParticipant.update(
			trpcContext,
			input,
			variables.userId,
			revert
		);
	},
};

type Props = {
	receiptParticipant: TRPCQueryOutput<"receipt-items.get">["participants"][number] & {
		sum: number;
	};
	receiptItemsInput: Cache.ReceiptItems.Get.Input;
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

	const usersInput = {
		...cache.users.getAvailable.DEFAULT_PARTIAL_INPUT,
		receiptId: receiptItemsInput.receiptId,
	};
	const user = React.useMemo(
		() => ({
			id: receiptParticipant.userId,
			name: receiptParticipant.name,
			publicName: receiptParticipant.publicName,
			connectedAccountId: receiptParticipant.connectedAccountId,
		}),
		[
			receiptParticipant.userId,
			receiptParticipant.name,
			receiptParticipant.publicName,
			receiptParticipant.connectedAccountId,
		]
	);
	const deleteReceiptParticipantMutation = trpc.useMutation(
		"receipt-participants.delete",
		useTrpcMutationOptions(deleteMutationOptions, {
			itemsInput: receiptItemsInput,
			usersInput,
			user,
		})
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
