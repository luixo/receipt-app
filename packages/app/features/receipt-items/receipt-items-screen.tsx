import React from "react";

import { Cache } from "app/cache";
import { Block } from "app/components/block";
import { ReceiptParticipantsScreen } from "app/features/receipt-participants/receipt-participants-screen";
import { TRPCQueryOutput } from "app/trpc";
import { Currency } from "app/utils/currency";

import { AddReceiptItemForm } from "./add-receipt-item-form";
import { ReceiptItem } from "./receipt-item";

type Props = {
	data: TRPCQueryOutput<"receipt-items.get">;
	receiptItemsInput: Cache.ReceiptItems.Get.Input;
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
