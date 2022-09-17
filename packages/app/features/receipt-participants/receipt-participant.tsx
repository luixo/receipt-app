import React from "react";

import { Spacer, styled, Text } from "@nextui-org/react";

import { ReceiptParticipantResolvedButton } from "app/components/app/receipt-participant-resolved-button";
import { User } from "app/components/app/user";
import { RemoveButton } from "app/components/remove-button";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { Currency } from "app/utils/currency";
import { convertParticipantToUser } from "app/utils/receipt-item";
import { ReceiptsId, UsersId } from "next-app/db/models";
import { Role } from "next-app/handlers/receipts/utils";

import { ReceiptParticipantRoleInput } from "./receipt-participant-role-input";

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
	};
	role: Role;
	currency?: Currency;
	isLoading: boolean;
};

export const ReceiptParticipant: React.FC<Props> = ({
	participant,
	receiptId,
	receiptSelfUserId,
	receiptLocked,
	role,
	currency,
	isLoading,
}) => {
	const accountQuery = trpc.account.get.useQuery();

	const removeReceiptParticipantMutation =
		trpc.receiptParticipants.remove.useMutation(
			useTrpcMutationOptions(mutations.receiptParticipants.remove.options, {
				context: {
					receiptId,
					selfAccountId: accountQuery.data?.id ?? "unknown",
					resolvedStatus: participant.resolved,
				},
			})
		);
	const removeReceiptParticipant = React.useCallback(
		() =>
			removeReceiptParticipantMutation.mutate({
				receiptId,
				userId: participant.remoteUserId,
			}),
		[removeReceiptParticipantMutation, receiptId, participant.remoteUserId]
	);

	return (
		<Body>
			<BodyElement>
				<User user={convertParticipantToUser(participant)} />
				<Spacer x={1} />
				<Text>
					{`${Math.round(participant.sum * 100) / 100} ${
						currency || "unknown"
					}`}
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
					{...(participant.remoteUserId !== receiptSelfUserId
						? { light: true }
						: { ghost: true })}
					css={{ px: "$6", boxSizing: "border-box" }}
					receiptId={receiptId}
					userId={participant.remoteUserId}
					selfUserId={receiptSelfUserId}
					resolved={participant.resolved}
				/>
				{role === "owner" ? (
					<>
						<Spacer x={0.5} />
						<RemoveButton
							onRemove={removeReceiptParticipant}
							mutation={removeReceiptParticipantMutation}
							disabled={!accountQuery.data || receiptLocked}
							subtitle="This will remove participant with all his parts"
							noConfirm={participant.sum === 0}
						/>
					</>
				) : null}
			</BodyElement>
		</Body>
	);
};
