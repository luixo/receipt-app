import React from "react";

import { EmptyCard } from "~app/components/empty-card";
import { AddReceiptItemController } from "~app/features/add-receipt-item/add-receipt-item-controller";
import { ReceiptParticipants } from "~app/features/receipt-participants/receipt-participants";
import type { TRPCQueryOutput } from "~app/trpc";
import type { ReceiptItemsId } from "~db/models";

import { ReceiptEmptyItems } from "./receipt-empty-items";
import { ReceiptItem } from "./receipt-item";

type InnerProps = {
	receipt: TRPCQueryOutput<"receipts.get">;
	isLoading: boolean;
};

export const ReceiptItems: React.FC<InnerProps> = ({ receipt, isLoading }) => {
	const itemsRef = React.useRef<Record<ReceiptItemsId, HTMLDivElement | null>>(
		{},
	);
	const sortedItems = React.useMemo(
		() =>
			receipt.items.toSorted(
				(a, b) => a.createdAt.valueOf() - b.createdAt.valueOf(),
			),
		[receipt.items],
	);
	return (
		<>
			<ReceiptEmptyItems receipt={receipt} itemsRef={itemsRef} />
			<ReceiptParticipants receipt={receipt} isLoading={isLoading} />
			<AddReceiptItemController receipt={receipt} isLoading={isLoading} />
			{sortedItems.map((item) => (
				<ReceiptItem
					key={item.id}
					item={item}
					receipt={receipt}
					isLoading={isLoading}
					ref={(element) => {
						itemsRef.current[item.id] = element;
					}}
				/>
			))}
			{sortedItems.length === 0 ? (
				<EmptyCard title="You have no receipt items yet">
					Press a button above to add a receipt item
				</EmptyCard>
			) : null}
		</>
	);
};
