import { ReceiptItem } from "./receipt-item";
import { TRPCQueryOutput } from "../trpc";
import { Block } from "./utils/block";

type InnerItemsProps = {
	data: TRPCQueryOutput<"receipt-items.get">;
};

export const ReceiptItems: React.FC<InnerItemsProps> = ({ data }) => {
	return (
		<Block name={`Total: ${data.length} items`}>
			{data.map((receiptItem) => (
				<ReceiptItem key={receiptItem.id} receiptItem={receiptItem} />
			))}
		</Block>
	);
};
