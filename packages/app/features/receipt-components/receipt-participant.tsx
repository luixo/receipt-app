import React from "react";
import { View } from "react-native";

import { LoadableUser } from "~app/components/app/loadable-user";
import { RemoveButton } from "~app/components/remove-button";
import { useFormattedCurrency } from "~app/hooks/use-formatted-currency";
import { useTrpcMutationState } from "~app/hooks/use-trpc-mutation-state";
import { trpc } from "~app/trpc";
import { Accordion, AccordionItem } from "~components/accordion";
import { Text } from "~components/text";
import { round } from "~utils/math";

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
	const sum = participant.debtSum;
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
	const { receiptId, currencyCode, selfUserId, renderParticipantActions } =
		useReceiptContext();
	const { removeParticipant } = useActionsHooksContext();
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
	const currency = useFormattedCurrency(currencyCode);
	const disabled = participant.items.length === 0;
	const sum = participant.debtSum;

	return (
		<Accordion>
			<AccordionItem
				key="parts"
				classNames={
					disabled
						? {
								base: "pointer-events-none",
								titleWrapper: "pointer-events-auto",
								indicator: "opacity-disabled",
						  }
						: undefined
				}
				textValue={`Participant ${participant.userId}`}
				title={
					<View className="flex-col items-start justify-between gap-2 min-[600px]:flex-row">
						<LoadableUser
							className={
								participant.items.length === 0 ? "opacity-disabled" : undefined
							}
							id={participant.userId}
							foreign={!isOwner}
						/>
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
								<ReceiptParticipantRoleInput participant={participant} />
								{isOwner ? (
									<RemoveButton
										onRemove={removeReceiptParticipant}
										mutation={{ isPending }}
										subtitle="This will remove participant with all his consumer parts"
										noConfirm={participant.debtSum === 0}
										isIconOnly
									/>
								) : null}
							</View>
						</View>
					</View>
				}
			>
				<View className="flex gap-4">
					{renderParticipantActions(participant)}
					<View>
						{participant.items.map((item) => (
							<Text key={item.id}>
								{item.name} -{" "}
								{`${round(item.sum)}${item.hasExtra ? "+" : ""} ${
									currency.symbol
								}`}
							</Text>
						))}
					</View>
				</View>
			</AccordionItem>
		</Accordion>
	);
};
