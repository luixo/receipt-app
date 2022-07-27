import React from "react";

import { Spacer, styled, Text } from "@nextui-org/react";

import { cache } from "app/cache";
import { ReceiptParticipantResolvedButton } from "app/components/receipt-participant-resolved-button";
import { RemoveButton } from "app/components/remove-button";
import { User } from "app/components/user";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { Currency } from "app/utils/currency";
import { ReceiptsId } from "next-app/db/models";
import { Role } from "next-app/handlers/receipts/utils";

import { ReceiptParticipantRoleInput } from "./receipt-participant-role-input";

const Wrapper = styled("div", {
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
});

const Body = styled("div", {
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",

	"@xsMax": {
		flexDirection: "column",
		alignItems: "flex-end",
	},
});

const BodyElement = styled("div", {
	display: "flex",
	alignItems: "center",
});

type Props = {
	receiptId: ReceiptsId;
	participant: TRPCQueryOutput<"receipt-items.get">["participants"][number] & {
		sum: number;
	};
	role: Role;
	currency?: Currency;
	isLoading: boolean;
};

export const ReceiptParticipant: React.FC<Props> = ({
	participant,
	receiptId,
	role,
	currency,
	isLoading,
}) => {
	const accountQuery = trpc.useQuery(["account.get"]);

	const deleteReceiptParticipantMutation = trpc.useMutation(
		"receipt-participants.delete",
		useTrpcMutationOptions(cache.receiptParticipants.delete.mutationOptions, {
			receiptId,
			user: {
				id: participant.userId,
				name: participant.name,
				// TODO: probably the only problem with this null
				// is that users that you can from available list
				// will not have their public names displayed
				// maybe we don't care about that enough to add logic on backend
				publicName: null,
				connectedAccountId: participant.connectedAccountId,
			},
		})
	);
	const deleteReceiptParticipant = useAsyncCallback(
		() =>
			deleteReceiptParticipantMutation.mutateAsync({
				receiptId,
				userId: participant.userId,
			}),
		[deleteReceiptParticipantMutation, receiptId, participant.userId]
	);

	return (
		<Wrapper>
			<User
				user={{
					id: participant.localUserId || participant.userId,
					name: participant.name,
				}}
			/>
			<Body>
				<BodyElement>
					<Text>
						{`${Math.round(participant.sum * 100) / 100} ${
							currency || "unknown"
						}`}
					</Text>
					<Spacer x={1} />
					<ReceiptParticipantRoleInput
						receiptId={receiptId}
						participant={participant}
						isLoading={isLoading}
						role={role}
					/>
				</BodyElement>
				<Spacer x={1} />
				<BodyElement>
					<ReceiptParticipantResolvedButton
						disabled={
							accountQuery.status !== "success" ||
							participant.connectedAccountId !== accountQuery.data.id
						}
						ghost
						receiptId={receiptId}
						userId={participant.userId}
						resolved={participant.resolved}
					/>
					{role === "owner" ? (
						<>
							<Spacer x={1} />
							<RemoveButton
								onRemove={deleteReceiptParticipant}
								mutation={deleteReceiptParticipantMutation}
								subtitle="This will remove participant with all his parts"
							/>
						</>
					) : null}
				</BodyElement>
			</Body>
		</Wrapper>
	);
};
