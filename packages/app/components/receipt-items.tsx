import { ReceiptItem } from "./receipt-item";
import { TRPCQueryOutput } from "../trpc";
import { Block } from "./utils/block";
import { ReceiptParticipantsScreen } from "../features/receipts/receipt-participants-screen";
import { AddReceiptItemForm } from "./add-receipt-item-form";
import { ReceiptItemsGetInput } from "../utils/queries/receipt-items";

type InnerItemsProps = {
	data: TRPCQueryOutput<"receipt-items.get">;
	receiptItemsInput: ReceiptItemsGetInput;
	role?: TRPCQueryOutput<"receipts.get">["role"];
};

export const ReceiptItems: React.FC<InnerItemsProps> = ({
	data,
	receiptItemsInput,
	role,
}) => {
	return (
		<Block name={`Total: ${data.items.length} items`}>
			<ReceiptParticipantsScreen
				participants={data.participants}
				receiptItemsInput={receiptItemsInput}
				role={role}
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
};
