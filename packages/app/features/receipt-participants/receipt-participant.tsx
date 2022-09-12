import React from "react";

import { Spacer, styled, Text } from "@nextui-org/react";

import { cache } from "app/cache";
import { ReceiptParticipantResolvedButton } from "app/components/app/receipt-participant-resolved-button";
import { User } from "app/components/app/user";
import { RemoveButton } from "app/components/remove-button";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { Currency } from "app/utils/currency";
import { convertParticipantToUser } from "app/utils/receipt-item";
import { ReceiptsId } from "next-app/db/models";
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
	receiptLocked,
	role,
	currency,
	isLoading,
}) => {
	const accountQuery = trpc.account.get.useQuery();

	const removeReceiptParticipantMutation =
		trpc.receiptParticipants.remove.useMutation(
			useTrpcMutationOptions(cache.receiptParticipants.remove.mutationOptions, {
				receiptId,
				selfAccountId: accountQuery.data?.id ?? "unknown",
			})
		);
	const removeReceiptParticipant = useAsyncCallback(
		() =>
			removeReceiptParticipantMutation.mutateAsync({
				receiptId,
				userId: participant.remoteUserId,
			}),
		[removeReceiptParticipantMutation, receiptId, participant.remoteUserId]
	);

	const accountQueryNotLoaded = accountQuery.status !== "success";
	const disabledParticipantResolvedButton =
		accountQueryNotLoaded || participant.accountId !== accountQuery.data.id;

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
					participant={participant}
					isLoading={isLoading}
					role={role}
				/>
				<Spacer x={0.5} />
				<ReceiptParticipantResolvedButton
					disabled={disabledParticipantResolvedButton}
					{...(disabledParticipantResolvedButton
						? { light: true }
						: { ghost: true })}
					css={{ px: "$6" }}
					receiptId={receiptId}
					remoteUserId={participant.remoteUserId}
					/* Button is enabled only is that's our button, so we have localUserId */
					localUserId={participant.localUserId!}
					resolved={participant.resolved}
				/>
				{role === "owner" ? (
					<>
						<Spacer x={0.5} />
						<RemoveButton
							onRemove={removeReceiptParticipant}
							mutation={removeReceiptParticipantMutation}
							disabled={accountQueryNotLoaded || receiptLocked}
							subtitle="This will remove participant with all his parts"
							noConfirm={participant.sum === 0}
						/>
					</>
				) : null}
			</BodyElement>
		</Body>
	);
};
