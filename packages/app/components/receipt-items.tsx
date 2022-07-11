import React from "react";

import { ReceiptParticipantsScreen } from "../features/receipts/receipt-participants-screen";
import { TRPCQueryOutput } from "../trpc";
import { Currency } from "../utils/currency";
import { ReceiptItemsGetInput } from "../utils/queries/receipt-items";

import { AddReceiptItemForm } from "./add-receipt-item-form";
import { ReceiptItem } from "./receipt-item";
import { Block } from "./utils/block";

type Props = {
	data: TRPCQueryOutput<"receipt-items.get">;
	receiptItemsInput: ReceiptItemsGetInput;
	role?: TRPCQueryOutput<"receipts.get">["role"];
	currency?: Currency;
	receiptId: TRPCQueryOutput<"receipts.get">["id"];
};

export const ReceiptItems: React.FC<Props> = ({
	data,
	receiptItemsInput,
	role,
	currency,
	receiptId,
}) => (
	<Block name={`Total: ${data.items.length} items`}>
		<ReceiptParticipantsScreen
			data={data}
			receiptItemsInput={receiptItemsInput}
			role={role}
			currency={currency}
			receiptId={receiptId}
		/>
		<AddReceiptItemForm receiptItemsInput={receiptItemsInput} />
		{data.items.map((receiptItem) => (
			<ReceiptItem
				key={receiptItem.id}
				receiptItem={receiptItem}
				receiptParticipants={data.participants}
				receiptItemsInput={receiptItemsInput}
				role={role}
			/>
		))}
	</Block>
);
