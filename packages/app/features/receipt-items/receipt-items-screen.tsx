import React from "react";

import { Collapse, Loading } from "@nextui-org/react";

import { QueryErrorMessage } from "app/components/query-error-message";
import { AddReceiptItemForm } from "app/features/receipt-items/add-receipt-item-form";
import { ReceiptParticipants } from "app/features/receipt-participants/receipt-participants";
import { trpc, TRPCQuerySuccessResult } from "app/trpc";
import { Currency } from "app/utils/currency";
import { ReceiptsId } from "next-app/db/models";

import { ReceiptItem } from "./receipt-item";

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
	<Collapse.Group accordion={false}>
		<Collapse title="🥸 Participants">
			<ReceiptParticipants
				data={data}
				receiptId={receiptId}
				currency={currency}
				isLoading={isLoading}
			/>
		</Collapse>
		<Collapse title="🍔 Items" expanded>
			<AddReceiptItemForm receiptId={receiptId} />
			{data.items.map((receiptItem) => (
				<ReceiptItem
					key={receiptItem.id}
					receiptId={receiptId}
					receiptItem={receiptItem}
					receiptParticipants={data.participants}
					role={data.role}
					isLoading={isLoading}
				/>
			))}
		</Collapse>
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
