import React from "react";

import { Collapse, Loading, Spacer, styled, Text } from "@nextui-org/react";

import { QueryErrorMessage } from "app/components/query-error-message";
import { AddReceiptItemController } from "app/features/add-receipt-item/add-receipt-item-controller";
import { ReceiptParticipants } from "app/features/receipt-participants/receipt-participants";
import { trpc, TRPCQuerySuccessResult } from "app/trpc";
import { Currency } from "app/utils/currency";
import { ReceiptsId } from "next-app/db/models";

import { ReceiptItem } from "./receipt-item";

const NoReceiptItems = styled("div", {
	textAlign: "center",
});

type InnerProps = {
	receiptId: ReceiptsId;
	currency?: Currency;
	query: TRPCQuerySuccessResult<"receipt-items.get">;
	isLoading: boolean;
};

export const ReceiptItemsInner: React.FC<InnerProps> = ({
	query: { data },
	receiptId,
	currency,
	isLoading,
}) => (
	<Collapse.Group accordion={false} divider={false}>
		<Collapse title="🥸 Participants">
			<ReceiptParticipants
				data={data}
				receiptId={receiptId}
				currency={currency}
				isLoading={isLoading}
			/>
		</Collapse>
		<AddReceiptItemController receiptId={receiptId} isLoading={isLoading} />
		<Spacer y={1} />
		{data.items.map((receiptItem, index) => (
			<React.Fragment key={receiptItem.id}>
				{index === 0 ? null : <Spacer y={1} />}
				<ReceiptItem
					receiptId={receiptId}
					receiptItem={receiptItem}
					receiptParticipants={data.participants}
					currency={currency}
					role={data.role}
					isLoading={isLoading}
				/>
			</React.Fragment>
		))}
		{data.items.length === 0 ? (
			<NoReceiptItems>
				<Text h3>You have no receipt items yet</Text>
				<Spacer y={1} />
				<Text h4>Press a button above to add a receipt item</Text>
			</NoReceiptItems>
		) : (
			<>
				<Spacer y={1} />
				<AddReceiptItemController receiptId={receiptId} isLoading={isLoading} />
			</>
		)}
	</Collapse.Group>
);

type Props = Omit<InnerProps, "query">;

export const ReceiptItems: React.FC<Props> = ({ receiptId, ...props }) => {
	const query = trpc.useQuery(["receipt-items.get", { receiptId }]);
	if (query.status === "loading") {
		return <Loading />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	if (query.status === "idle") {
		return null;
	}
	return <ReceiptItemsInner {...props} receiptId={receiptId} query={query} />;
};
