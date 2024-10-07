import React from "react";
import { View } from "react-native";

import { skipToken } from "@tanstack/react-query";

import { LoadableUser } from "~app/components/app/loadable-user";
import { ReceiptParticipantResolvedButton } from "~app/components/app/receipt-participant-resolved-button";
import { RemoveButton } from "~app/components/remove-button";
import { useFormattedCurrency } from "~app/hooks/use-formatted-currency";
import { useSelfAccountId } from "~app/hooks/use-self-account-id";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { Accordion, AccordionItem } from "~components/accordion";
import { Text } from "~components/text";
import type { ReceiptItemsId } from "~db/models";
import { options as receiptParticipantsRemoveOptions } from "~mutations/receipt-participants/remove";
import { round } from "~utils/math";

import { ReceiptParticipantRoleInput } from "./receipt-participant-role-input";

type Props = {
	participant: TRPCQueryOutput<"receipts.get">["participants"][number] & {
		sum: number;
		items: {
			sum: number;
			id: ReceiptItemsId;
			hasExtra: boolean;
			name: string;
		}[];
	};
	receipt: TRPCQueryOutput<"receipts.get">;
	isLoading: boolean;
};

export const ReceiptParticipant: React.FC<Props> = ({
	participant,
	receipt,
	isLoading,
}) => {
	const selfAccountId = useSelfAccountId();

	const removeReceiptParticipantMutation =
		trpc.receiptParticipants.remove.useMutation(
			useTrpcMutationOptions(receiptParticipantsRemoveOptions, {
				context: selfAccountId
					? {
							receiptId: receipt.id,
							selfAccountId,
							resolvedStatus: participant.resolved,
					  }
					: skipToken,
			}),
		);
	const removeReceiptParticipant = React.useCallback(
		() =>
			removeReceiptParticipantMutation.mutate({
				receiptId: receipt.id,
				userId: participant.userId,
			}),
		[removeReceiptParticipantMutation, receipt.id, participant.userId],
	);
	const currency = useFormattedCurrency(receipt.currencyCode);
	const disabled = participant.items.length === 0;
	const isOwner = receipt.ownerUserId === receipt.selfUserId;

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
							<Text>{`${round(participant.sum)} ${currency}`}</Text>
							<View className="flex-row items-center gap-2">
								<ReceiptParticipantRoleInput
									participant={participant}
									receipt={receipt}
									isLoading={isLoading}
								/>
								<ReceiptParticipantResolvedButton
									variant={
										participant.userId === receipt.selfUserId
											? "ghost"
											: "light"
									}
									userId={participant.userId}
									resolved={participant.resolved}
									receipt={receipt}
								/>
								{isOwner ? (
									<RemoveButton
										onRemove={removeReceiptParticipant}
										mutation={removeReceiptParticipantMutation}
										isDisabled={
											!selfAccountId || Boolean(receipt.lockedTimestamp)
										}
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
				{participant.items.map((item) => (
					<Text key={item.id}>
						{item.name} -{" "}
						{`${round(item.sum)}${item.hasExtra ? "+" : ""} ${currency}`}
					</Text>
				))}
			</AccordionItem>
		</Accordion>
	);
};
