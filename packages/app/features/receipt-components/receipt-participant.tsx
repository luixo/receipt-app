import React from "react";
import { View } from "react-native";

import { LoadableUser } from "~app/components/app/loadable-user";
import { PartButtons } from "~app/components/app/part-buttons";
import { RemoveButton } from "~app/components/remove-button";
import { useFormattedCurrency } from "~app/hooks/use-formatted-currency";
import { useTrpcMutationState } from "~app/hooks/use-trpc-mutation-state";
import { trpc } from "~app/trpc";
import { Accordion, AccordionItem } from "~components/accordion";
import { Button } from "~components/button";
import { Divider } from "~components/divider";
import { MoneyIcon } from "~components/icons";
import { Text } from "~components/text";
import { round } from "~utils/math";
import { updateSetStateAction } from "~utils/react";

import { useActionsHooksContext, useReceiptContext } from "./context";
import { useIsOwner } from "./hooks";
import { ReceiptParticipantRoleInput } from "./receipt-participant-role-input";
import type { Participant } from "./state";

const getParticipantColorCode = (
	participant: Participant,
	hasConnectedAccount: boolean,
	isOwner: boolean,
	isSelfParticipant: boolean,
) => {
	if (!isOwner && !isSelfParticipant) {
		// We don't have data on foreign debts with a foreign receipt
		return;
	}
	if (isOwner && isSelfParticipant) {
		// We don't have debt for ourselves
		return;
	}
	const sum = participant.debtSum - participant.paySum;
	if (sum === 0) {
		return;
	}
	if (participant.currentDebt === null) {
		// We're waiting for all debts to load
		return;
	}
	if (!participant.currentDebt) {
		// No debt has been propagated
		return "text-warning";
	}
	if (participant.currentDebt.amount !== sum) {
		// Our debt is desynced from the receipt
		return "text-danger";
	}
	if (!hasConnectedAccount) {
		// Debt is not syncable
		return;
	}
	if (!participant.currentDebt.their) {
		// Our debts exists, their does not
		return "text-warning";
	}
	if (participant.currentDebt.amount !== participant.currentDebt.their.amount) {
		// Our debt is desynced from their debt
		return "text-warning";
	}
	// In sync
};

type Props = {
	participant: Participant;
};

export const ReceiptParticipant: React.FC<Props> = ({ participant }) => {
	const {
		receiptId,
		currencyCode,
		selfUserId,
		renderParticipantActions,
		items,
		participants,
	} = useReceiptContext();
	const { removeParticipant, updatePayerPart, addPayer, removePayer } =
		useActionsHooksContext();
	const isOwner = useIsOwner();
	const userQuery = trpc.users.get.useQuery({ id: participant.userId });

	const removeParticipantMutationState =
		useTrpcMutationState<"receiptParticipants.remove">(
			trpc.receiptParticipants.remove,
			(vars) =>
				vars.receiptId === receiptId && vars.userId === participant.userId,
		);
	const isPending = removeParticipantMutationState?.status === "pending";
	const removeReceiptParticipant = React.useCallback(() => {
		removeParticipant(participant.userId);
	}, [participant.userId, removeParticipant]);
	const currentPart = participant.payPart ?? 0;
	const onAddPayer = React.useCallback(() => {
		addPayer(participant.userId, 1);
	}, [addPayer, participant.userId]);
	const onPartUpdate = React.useCallback(
		(setStateAction: React.SetStateAction<number>) => {
			const nextPart = updateSetStateAction(setStateAction, currentPart);
			if (nextPart === currentPart) {
				return;
			}
			if (nextPart === 0) {
				removePayer(participant.userId);
			} else {
				updatePayerPart(participant.userId, nextPart);
			}
		},
		[currentPart, participant.userId, removePayer, updatePayerPart],
	);
	const addPayerMutationState =
		useTrpcMutationState<"receiptItemConsumers.add">(
			trpc.receiptItemConsumers.add,
			(vars) => vars.itemId === receiptId && vars.userId === participant.userId,
		);
	const removePayerMutationState =
		useTrpcMutationState<"receiptItemConsumers.remove">(
			trpc.receiptItemConsumers.remove,
			(vars) => vars.itemId === receiptId && vars.userId === participant.userId,
		);
	const updatePayerMutationState =
		useTrpcMutationState<"receiptItemConsumers.update">(
			trpc.receiptItemConsumers.update,
			(vars) => vars.itemId === receiptId && vars.userId === participant.userId,
		);
	const isPayerPending =
		addPayerMutationState?.status === "pending" ||
		removePayerMutationState?.status === "pending" ||
		updatePayerMutationState?.status === "pending";
	const currency = useFormattedCurrency(currencyCode);
	const disabled = participant.items.length === 0;
	const sum = participant.debtSum - participant.paySum;
	const totalPayParts = participants.reduce(
		(acc, { payPart }) => acc + (payPart ?? 0),
		0,
	);

	return (
		<Accordion>
			<AccordionItem
				key="parts"
				textValue={`Participant ${participant.userId}`}
				title={
					<View className="flex-col items-start justify-between gap-2 min-[600px]:flex-row">
						<View className="flex flex-row items-center gap-1">
							{currentPart ? (
								<MoneyIcon className="text-secondary" size={24} />
							) : null}
							<LoadableUser
								className={
									disabled && !currentPart ? "opacity-disabled" : undefined
								}
								id={participant.userId}
								foreign={!isOwner}
							/>
						</View>
						<View className="flex-row items-center justify-between gap-4 self-stretch">
							<Text
								className={getParticipantColorCode(
									participant,
									Boolean(userQuery.data?.connectedAccount),
									isOwner,
									participant.userId === selfUserId,
								)}
							>
								{`${round(sum)} ${currency.symbol}`}
								{participant.currentDebt
									? (isOwner ? 1 : -1) * participant.currentDebt.amount !== sum
										? ` (synced as ${round(participant.currentDebt.amount)} ${
												currency.symbol
										  })`
										: undefined
									: null}
							</Text>
							<View className="flex-row items-center gap-2">
								{isOwner ? (
									<RemoveButton
										onRemove={removeReceiptParticipant}
										mutation={{ isPending }}
										subtitle="This will remove participant with all his consumer parts"
										noConfirm={
											participant.debtSum === 0 && participant.paySum === 0
										}
										isIconOnly
									/>
								) : null}
							</View>
						</View>
					</View>
				}
			>
				<View className="flex gap-3">
					<View className="flex flex-row items-center justify-between gap-4">
						<ReceiptParticipantRoleInput participant={participant} />
						<View className="flex flex-row items-center gap-2">
							{currentPart ? (
								<>
									<Text>Payed</Text>
									<PartButtons
										isPending={isPayerPending}
										updatePart={onPartUpdate}
										downDisabled={currentPart <= 0}
										upDisabled={currentPart === totalPayParts}
									>
										<Text className="w-10 text-center">
											{totalPayParts === 1
												? "All"
												: `${currentPart} / ${totalPayParts}`}
										</Text>
									</PartButtons>
								</>
							) : (
								<Button onClick={onAddPayer}>+ Payer</Button>
							)}
						</View>
						{renderParticipantActions(participant)}
					</View>
					{currentPart && items.length !== 0 ? <Divider /> : null}
					<View className="flex flex-col gap-3">
						{currentPart && items.length !== 0 ? (
							<Text className="text-secondary">
								{`Payed ${participant.paySum} ${currency.symbol} of the total receipt`}
							</Text>
						) : null}
						<View>
							{currentPart && participant.items.length > 1 ? (
								<Text className="text-secondary">
									{`Spent ${participant.debtSum} ${currency.symbol} in total`}
								</Text>
							) : null}
							{participant.items.map((item) => (
								<Text key={item.id}>
									{`${item.name} - ${round(item.sum)}${
										item.hasExtra ? "+" : ""
									} ${currency.symbol}`}
								</Text>
							))}
						</View>
					</View>
				</View>
			</AccordionItem>
		</Accordion>
	);
};
