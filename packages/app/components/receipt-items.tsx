import { ReceiptItem } from "./receipt-item";
import { TRPCQueryOutput } from "../trpc";
import { Block } from "./utils/block";
import { ReceiptParticipantsScreen } from "../features/receipts/receipt-participants-screen";

type InnerItemsProps = {
	data: TRPCQueryOutput<"receipt-items.get">;
};

export const ReceiptItems: React.FC<InnerItemsProps> = ({ data }) => {
	return (
		<Block name={`Total: ${data.items.length} items`}>
			<ReceiptParticipantsScreen participants={data.participants} />
			{data.items.map((receiptItem) => (
				<ReceiptItem
					key={receiptItem.id}
					receiptItem={receiptItem}
					receiptParticipants={data.participants}
				/>
			))}
		</Block>
	);
};
