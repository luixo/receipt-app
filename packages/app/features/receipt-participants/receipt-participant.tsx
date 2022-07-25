import React from "react";
import * as ReactNative from "react-native";

import { cache } from "app/cache";
import { Block } from "app/components/block";
import { MutationWrapper } from "app/components/mutation-wrapper";
import { RemoveButton } from "app/components/remove-button";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { Currency } from "app/utils/currency";
import { Text } from "app/utils/styles";
import { ReceiptsId } from "next-app/db/models";
import { Role } from "next-app/handlers/receipts/utils";

import {
	AssignableRole,
	ReceiptParticipantRoleChange,
} from "./receipt-participant-role-change";

type Props = {
	receiptId: ReceiptsId;
	receiptParticipant: TRPCQueryOutput<"receipt-items.get">["participants"][number] & {
		sum: number;
	};
	role: Role;
	currency?: Currency;
};

export const ReceiptParticipant: React.FC<Props> = ({
	receiptParticipant,
	receiptId,
	role,
	currency,
}) => {
	const accountQuery = trpc.useQuery(["account.get"]);

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
		useTrpcMutationOptions(cache.receiptParticipants.delete.mutationOptions, {
			receiptId,
			user,
		})
	);
	const deleteReceiptParticipant = useAsyncCallback(
		() =>
			deleteReceiptParticipantMutation.mutateAsync({
				receiptId,
				userId: receiptParticipant.userId,
			}),
		[deleteReceiptParticipantMutation, receiptId, receiptParticipant.userId]
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
		useTrpcMutationOptions(cache.receiptParticipants.update.mutationOptions, {
			isSelfAccount: receiptParticipant.localUserId === accountQuery.data?.id,
		})
	);
	const changeRole = React.useCallback(
		(assignableRole: AssignableRole) => {
			updateReceiptMutation.mutate({
				receiptId,
				userId: receiptParticipant.userId,
				update: { type: "role", role: assignableRole },
			});
		},
		[updateReceiptMutation, receiptId, receiptParticipant.userId]
	);
	const switchResolved = React.useCallback(() => {
		updateReceiptMutation.mutate({
			receiptId,
			userId: receiptParticipant.userId,
			update: { type: "resolved", resolved: !receiptParticipant.resolved },
		});
	}, [
		updateReceiptMutation,
		receiptId,
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
			{role === "owner" ? (
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
