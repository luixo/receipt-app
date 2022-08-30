import React from "react";

import { Spacer, styled } from "@nextui-org/react";

import { ReceiptParticipantResolvedButton } from "app/components/app/receipt-participant-resolved-button";
import { QueryErrorMessage } from "app/components/error-message";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { UsersId } from "next-app/db/models";

import { ReceiptLockedButton } from "./receipt-locked-button";

const Wrapper = styled("div", {
	display: "flex",
	alignItems: "center",
	color: "$primary",

	variants: {
		locked: {
			true: {
				color: "$secondary",
			},
		},
	},
});

type Receipt = TRPCQueryOutput<"receipts.get">;

type Props = {
	receipt: Receipt;
	deleteLoading: boolean;
};

export const ReceiptControlButtons: React.FC<Props> = ({
	receipt,
	deleteLoading,
}) => {
	const accountQuery = trpc.useQuery(["account.get"]);

	return (
		<Wrapper locked={receipt.locked}>
			<ReceiptParticipantResolvedButton
				ghost
				receiptId={receipt.id}
				remoteUserId={receipt.selfUserId}
				// Typesystem doesn't know that we use account id as self user id
				localUserId={accountQuery.data?.id! as UsersId}
				resolved={receipt.participantResolved}
				disabled={deleteLoading || accountQuery.status !== "success"}
			/>
			<Spacer x={0.5} />
			<ReceiptLockedButton
				receiptId={receipt.id}
				locked={receipt.locked}
				isLoading={deleteLoading}
			/>
			{accountQuery.status === "error" ? (
				<>
					<Spacer x={1} />
					<QueryErrorMessage query={accountQuery} />
				</>
			) : null}
		</Wrapper>
	);
};
