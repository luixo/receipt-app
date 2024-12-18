import React from "react";
import { View } from "react-native";

import { LoadableUser } from "~app/components/app/loadable-user";
import { PartButtons } from "~app/components/app/part-buttons";
import { RemoveButton } from "~app/components/remove-button";
import { useDecimals, useRoundParts } from "~app/hooks/use-decimals";
import { useFormattedCurrency } from "~app/hooks/use-formatted-currency";
import { useTrpcMutationState } from "~app/hooks/use-trpc-mutation-state";
import { trpc } from "~app/trpc";
import { Accordion, AccordionItem } from "~components/accordion";
import { Button } from "~components/button";
import { Divider } from "~components/divider";
import { MoneyIcon } from "~components/icons";
import { Text } from "~components/text";
import { Tooltip } from "~components/tooltip";
import { round } from "~utils/math";
import { updateSetStateAction } from "~utils/react";

import { useActionsHooksContext, useReceiptContext } from "./context";
import { useIsOwner } from "./hooks";
import { ReceiptParticipantRoleInput } from "./receipt-participant-role-input";
import type { Participant } from "./state";

const getParticipantError = (
	participant: Participant,
	hasConnectedAccount: boolean,
	isOwner: boolean,
	isSelfParticipant: boolean,
	fromSubunitToUnit: (input: number) => number,
) => {
	if (!isOwner && !isSelfParticipant) {
		// We don't have data on foreign debts with a foreign receipt
		return;
	}
	if (isOwner && isSelfParticipant) {
		// We don't have debt for ourselves
		return;
	}
	const sum = fromSubunitToUnit(
		participant.debtSumDecimals - participant.paySumDecimals,
	);
	if (sum === 0) {
		return;
	}
	if (participant.currentDebt === null) {
		// We're waiting for all debts to load
		return;
	}
	if (!participant.currentDebt) {
		// No debt has been propagated
		return {
			className: "text-warning",
			content: "No debt has been propagated",
		};
	}
	const expectedSum = isOwner ? sum : -sum;
	if (participant.currentDebt.amount !== expectedSum) {
		// Our debt is desynced from the receipt
		return {
			className: "text-danger",
			content: `Our debt is currently "${participant.currentDebt.amount}", but it should be "${expectedSum}" according to the receipt.`,
		};
	}
	if (!hasConnectedAccount) {
		// Debt is not syncable
		return;
	}
	if (!participant.currentDebt.their) {
		// Our debts exists, their does not
		return {
			className: "text-warning",
			content: "They did not accept the debt yet",
		};
	}
	if (participant.currentDebt.amount !== participant.currentDebt.their.amount) {
		// Our debt is desynced from their debt
		return {
			className: "text-warning",
			content: `They accepted the debt for "${participant.currentDebt.their.amount}", while we intent the amount is "${participant.currentDebt.amount}"`,
		};
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
	const { fromSubunitToUnit } = useDecimals();
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
	const sum = fromSubunitToUnit(
		participant.debtSumDecimals - participant.paySumDecimals,
	);
	const roundParts = useRoundParts();
	const totalPayParts = roundParts(
		participants.reduce((acc, { payPart }) => acc + (payPart ?? 0), 0),
	);
	const participantError = getParticipantError(
		participant,
		Boolean(userQuery.data?.connectedAccount),
		isOwner,
		participant.userId === selfUserId,
		fromSubunitToUnit,
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
							<Tooltip
								content={participantError?.content}
								isDisabled={!participantError}
							>
								<View>
									<Text className={participantError?.className}>
										{`${round(sum)} ${currency.symbol}`}
									</Text>
								</View>
							</Tooltip>
							<View className="flex-row items-center gap-2">
								{isOwner ? (
									<RemoveButton
										onRemove={removeReceiptParticipant}
										mutation={{ isPending }}
										subtitle="This will remove participant with all his consumer parts"
										noConfirm={
											participant.debtSumDecimals === 0 &&
											participant.paySumDecimals === 0
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
								<Button onPress={onAddPayer}>+ Payer</Button>
							)}
						</View>
						{renderParticipantActions(participant)}
					</View>
					{currentPart && items.length !== 0 ? <Divider /> : null}
					<View className="flex flex-col gap-3">
						{currentPart && items.length !== 0 ? (
							<Text className="text-secondary">
								{`Payed ${fromSubunitToUnit(participant.paySumDecimals)} ${
									currency.symbol
								} of the total receipt`}
							</Text>
						) : null}
						<View>
							{currentPart && participant.items.length > 1 ? (
								<Text className="text-secondary">
									{`Spent ${fromSubunitToUnit(participant.debtSumDecimals)} ${
										currency.symbol
									} in total`}
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
