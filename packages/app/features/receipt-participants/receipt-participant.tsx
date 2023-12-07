import React from "react";
import { View } from "react-native";

import { Accordion, AccordionItem } from "@nextui-org/react";

import { ReceiptParticipantResolvedButton } from "app/components/app/receipt-participant-resolved-button";
import { User } from "app/components/app/user";
import { Text } from "app/components/base/text";
import { RemoveButton } from "app/components/remove-button";
import { useFormattedCurrency } from "app/hooks/use-formatted-currency";
import { useSelfAccountId } from "app/hooks/use-self-account-id";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";
import type { CurrencyCode } from "app/utils/currency";
import { convertParticipantToUser } from "app/utils/receipt-item";
import type { ReceiptItemsId, ReceiptsId, UsersId } from "next-app/db/models";
import type { Role } from "next-app/handlers/receipts/utils";

import { ReceiptParticipantRoleInput } from "./receipt-participant-role-input";

type Props = {
	receiptId: ReceiptsId;
	receiptSelfUserId?: UsersId;
	receiptLocked: boolean;
	participant: TRPCQueryOutput<"receiptItems.get">["participants"][number] & {
		sum: number;
		items: {
			sum: number;
			id: ReceiptItemsId;
			hasExtra: boolean;
			name: string;
		}[];
	};
	role: Role;
	currencyCode?: CurrencyCode;
	isLoading: boolean;
};

export const ReceiptParticipant: React.FC<Props> = ({
	participant,
	receiptId,
	receiptSelfUserId,
	receiptLocked,
	role,
	currencyCode,
	isLoading,
}) => {
	const selfAccountId = useSelfAccountId();

	const removeReceiptParticipantMutation =
		trpc.receiptParticipants.remove.useMutation(
			useTrpcMutationOptions(mutations.receiptParticipants.remove.options, {
				context: {
					receiptId,
					selfAccountId: selfAccountId || "unknown",
					resolvedStatus: participant.resolved,
				},
			}),
		);
	const removeReceiptParticipant = React.useCallback(
		() =>
			removeReceiptParticipantMutation.mutate({
				receiptId,
				userId: participant.remoteUserId,
			}),
		[removeReceiptParticipantMutation, receiptId, participant.remoteUserId],
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
				textValue={participant.name}
				title={
					<View className="flex-col justify-between gap-4 min-[600px]:flex-row">
						<View className="flex-col items-start justify-start gap-4 self-start sm:flex-row sm:items-center">
							<User
								className={
									participant.items.length === 0
										? "opacity-disabled"
										: undefined
								}
								user={convertParticipantToUser(participant)}
							/>
							<Text>
								{`${Math.round(participant.sum * 100) / 100} ${currency}`}
							</Text>
						</View>
						<View className="flex-row gap-2 self-end">
							<View className="flex-row items-center gap-2">
								<ReceiptParticipantRoleInput
									receiptId={receiptId}
									selfUserId={receiptSelfUserId}
									participant={participant}
									isLoading={isLoading}
									role={role}
								/>
								<ReceiptParticipantResolvedButton
									variant={
										participant.remoteUserId === receiptSelfUserId
											? "ghost"
											: "light"
									}
									receiptId={receiptId}
									userId={participant.remoteUserId}
									selfUserId={receiptSelfUserId}
									resolved={
										participant.remoteUserId === receiptSelfUserId
											? participant.resolved
											: null
									}
								/>
							</View>
							{role === "owner" ? (
								<RemoveButton
									onRemove={removeReceiptParticipant}
									mutation={removeReceiptParticipantMutation}
									isDisabled={!selfAccountId || receiptLocked}
									subtitle="This will remove participant with all his parts"
									noConfirm={participant.sum === 0}
									isIconOnly
								/>
							) : null}
						</View>
					</View>
				}
			>
				{participant.items.map((item) => (
					<Text key={item.id}>
						{item.name} -{" "}
						{`${Math.round(item.sum * 100) / 100}${
							item.hasExtra ? "+" : ""
						} ${currency}`}
					</Text>
				))}
			</AccordionItem>
		</Accordion>
	);
};
