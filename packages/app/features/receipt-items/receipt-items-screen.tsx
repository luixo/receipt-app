import React from "react";

import { Block } from "app/components/block";
import { ReceiptParticipantsScreen } from "app/features/receipt-participants/receipt-participants-screen";
import { TRPCQueryOutput } from "app/trpc";
import { Currency } from "app/utils/currency";
import { ReceiptsId } from "next-app/db/models";

import { AddReceiptItemForm } from "./add-receipt-item-form";
import { ReceiptItem } from "./receipt-item";

type Props = {
	receiptId: ReceiptsId;
	data: TRPCQueryOutput<"receipt-items.get">;
	role?: TRPCQueryOutput<"receipts.get">["role"];
	currency?: Currency;
};

export const ReceiptItems: React.FC<Props> = ({
	data,
	role,
	currency,
	receiptId,
}) => (
	<Block name={`Total: ${data.items.length} items`}>
		<ReceiptParticipantsScreen
			data={data}
			receiptId={receiptId}
			role={role}
			currency={currency}
		/>
		<AddReceiptItemForm receiptId={receiptId} />
		{data.items.map((receiptItem) => (
			<ReceiptItem
				key={receiptItem.id}
				receiptId={receiptId}
				receiptItem={receiptItem}
				receiptParticipants={data.participants}
				role={role}
			/>
		))}
	</Block>
);
