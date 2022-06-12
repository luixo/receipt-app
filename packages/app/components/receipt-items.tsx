import { ReceiptItem } from "./receipt-item";
import { TRPCQueryOutput } from "../trpc";
import { Block } from "./utils/block";

type InnerItemsProps = {
	data: TRPCQueryOutput<"receipt-items.get">;
};

export const ReceiptItems: React.FC<InnerItemsProps> = ({ data }) => {
	return (
		<Block name={`Total: ${data.items.length} items`}>
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
