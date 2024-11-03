import React from "react";
import { View } from "react-native";

import { LoadableUser } from "~app/components/app/loadable-user";
import { RemoveButton } from "~app/components/remove-button";
import { useFormattedCurrency } from "~app/hooks/use-formatted-currency";
import type { Participant } from "~app/hooks/use-participants";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import { Accordion, AccordionItem } from "~components/accordion";
import { Text } from "~components/text";
import { options as receiptParticipantsRemoveOptions } from "~mutations/receipt-participants/remove";
import { round } from "~utils/math";

import { useReceiptContext } from "./context";
import { useIsOwner } from "./hooks";
import { ReceiptParticipantActions } from "./receipt-participant-actions";
import { ReceiptParticipantRoleInput } from "./receipt-participant-role-input";

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
	if (participant.sum === 0) {
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
	if (participant.currentDebt.amount !== participant.sum) {
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
	const { receiptId, currencyCode, selfUserId } = useReceiptContext();
	const isOwner = useIsOwner();
	const userQuery = trpc.users.get.useQuery({ id: participant.userId });

	const removeReceiptParticipantMutation =
		trpc.receiptParticipants.remove.useMutation(
			useTrpcMutationOptions(receiptParticipantsRemoveOptions, {
				context: { receiptId },
			}),
		);
	const removeReceiptParticipant = React.useCallback(
		() =>
			removeReceiptParticipantMutation.mutate({
				receiptId,
				userId: participant.userId,
			}),
		[removeReceiptParticipantMutation, receiptId, participant.userId],
	);
	const currency = useFormattedCurrency(currencyCode);
	const disabled = participant.items.length === 0;

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
								{`${round(participant.sum)} ${currency.symbol}`}
								{participant.currentDebt
									? (isOwner ? 1 : -1) * participant.currentDebt.amount !==
									  participant.sum
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
										mutation={removeReceiptParticipantMutation}
										subtitle="This will remove participant with all his parts"
										noConfirm={participant.sum === 0}
										isIconOnly
									/>
								) : null}
							</View>
						</View>
					</View>
				}
			>
				<View className="flex gap-4">
					{isOwner ? (
						<ReceiptParticipantActions participant={participant} />
					) : null}
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
