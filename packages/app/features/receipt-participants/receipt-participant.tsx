import React from "react";

import { Collapse, Spacer, Text, styled } from "@nextui-org/react";

import { ReceiptParticipantResolvedButton } from "app/components/app/receipt-participant-resolved-button";
import { User } from "app/components/app/user";
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

const Wrapper = styled("div", {
	display: "flex",
});

const Body = styled("div", {
	display: "flex",
	justifyContent: "space-between",

	"@xsMax": {
		flexDirection: "column",
	},
});

const BodyElement = styled("div", {
	display: "flex",
	alignItems: "center",
});

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

	return (
		<Collapse
			disabled={participant.items.length === 0}
			title={
				<Wrapper>
					<Body>
						<BodyElement>
							<User user={convertParticipantToUser(participant)} />
							<Spacer x={1} />
							<Text>
								{`${Math.round(participant.sum * 100) / 100} ${currency}`}
							</Text>
						</BodyElement>
						<Spacer x={1} />
						<BodyElement css={{ alignSelf: "flex-end" }}>
							<ReceiptParticipantRoleInput
								receiptId={receiptId}
								selfUserId={receiptSelfUserId}
								participant={participant}
								isLoading={isLoading}
								role={role}
							/>
							<Spacer x={0.5} />
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
							{role === "owner" ? (
								<>
									<Spacer x={0.5} />
									<RemoveButton
										onRemove={removeReceiptParticipant}
										mutation={removeReceiptParticipantMutation}
										isDisabled={!selfAccountId || receiptLocked}
										subtitle="This will remove participant with all his parts"
										noConfirm={participant.sum === 0}
									/>
								</>
							) : null}
						</BodyElement>
					</Body>
					<Spacer x={0.5} />
				</Wrapper>
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
		</Collapse>
	);
};
