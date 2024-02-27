import React from "react";
import { View } from "react-native";

import { Spinner } from "@nextui-org/react";

import { Header } from "~app/components/base/header";
import { EmptyCard } from "~app/components/empty-card";
import { QueryErrorMessage } from "~app/components/error-message";
import type { TRPCQuerySuccessResult } from "~app/trpc";
import { trpc } from "~app/trpc";

import { InboundReceiptTransferIntention } from "./inbound-receipt-transfer-intention";
import { OutboundReceiptTransferIntention } from "./outbound-receipt-transfer-intention";

type IntentionsQuery =
	TRPCQuerySuccessResult<"receiptTransferIntentions.getAll">;

type Props = {
	query: IntentionsQuery;
};

const ReceiptTransferIntentionsInner: React.FC<Props> = ({
	query: { data },
}) => {
	if (data.inbound.length === 0 && data.outbound.length === 0) {
		return (
			<EmptyCard title="You have no incoming or outcoming receipt transfer requests">
				You can transfer a receipt you own on its page
			</EmptyCard>
		);
	}
	return (
		<>
			{data.inbound.length === 0 ? null : (
				<>
					<Header>Inbound</Header>
					{data.inbound.map((intention) => (
						<InboundReceiptTransferIntention
							key={intention.receipt.id}
							intention={intention}
						/>
					))}
				</>
			)}
			{data.outbound.length === 0 ? null : (
				<>
					<Header>Outbound</Header>
					{data.outbound.map((intention) => (
						<OutboundReceiptTransferIntention
							key={intention.receipt.id}
							intention={intention}
						/>
					))}
				</>
			)}
		</>
	);
};

const ReceiptTransferIntentionsData: React.FC = () => {
	const query = trpc.receiptTransferIntentions.getAll.useQuery();
	if (query.status === "pending") {
		return <Spinner size="lg" />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <ReceiptTransferIntentionsInner query={query} />;
};

export const ReceiptTransferIntentions: React.FC = () => (
	<View className="gap-4" testID="receipt-transfer-intentions">
		<ReceiptTransferIntentionsData />
	</View>
);
