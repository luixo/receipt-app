import React from "react";
import { View } from "react-native";

import { Accordion, AccordionItem } from "@nextui-org/react";

import { LoadableUser } from "app/components/app/loadable-user";
import { ReceiptParticipantResolvedButton } from "app/components/app/receipt-participant-resolved-button";
import { Text } from "app/components/base/text";
import { RemoveButton } from "app/components/remove-button";
import { useFormattedCurrency } from "app/hooks/use-formatted-currency";
import { useSelfAccountId } from "app/hooks/use-self-account-id";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";
import type { CurrencyCode } from "app/utils/currency";
import type { ReceiptItemsId, ReceiptsId, UsersId } from "next-app/db/models";

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
	isOwner: boolean;
	currencyCode?: CurrencyCode;
	isLoading: boolean;
};

export const ReceiptParticipant: React.FC<Props> = ({
	participant,
	receiptId,
	receiptSelfUserId,
	receiptLocked,
	isOwner,
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
				userId: participant.userId,
			}),
		[removeReceiptParticipantMutation, receiptId, participant.userId],
	);
	const currency = useFormattedCurrency(currencyCode);
	const disabled = participant.items.length === 0;

	const userQuery = trpc.users.getForeign.useQuery({ id: participant.userId });

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
				textValue={userQuery.data?.name || "..."}
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
							<Text>
								{`${Math.round(participant.sum * 100) / 100} ${currency}`}
							</Text>
							<View className="flex-row items-center gap-2">
								<ReceiptParticipantRoleInput
									receiptId={receiptId}
									selfUserId={receiptSelfUserId}
									participant={participant}
									isLoading={isLoading}
									isOwner={isOwner}
								/>
								<ReceiptParticipantResolvedButton
									variant={
										participant.userId === receiptSelfUserId ? "ghost" : "light"
									}
									receiptId={receiptId}
									userId={participant.userId}
									selfUserId={receiptSelfUserId}
									resolved={
										participant.userId === receiptSelfUserId
											? participant.resolved
											: null
									}
								/>
								{isOwner ? (
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
