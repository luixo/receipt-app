import React from "react";

import { EmptyCard } from "~app/components/empty-card";
import type { TRPCQueryOutput } from "~app/trpc";
import type { ReceiptItemsId } from "~db/models";

import { AddReceiptItemController } from "./add-receipt-item-controller";
import { ReceiptEmptyItems } from "./receipt-empty-items";
import { ReceiptItem } from "./receipt-item";

type InnerProps = {
	receipt: TRPCQueryOutput<"receipts.get">;
	isDisabled: boolean;
};

export const ReceiptItems: React.FC<InnerProps> = ({ receipt, isDisabled }) => {
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
	const addItemComponent = (
		<AddReceiptItemController receipt={receipt} isDisabled={isDisabled} />
	);
	if (receipt.items.length === 0) {
		return (
			<>
				{addItemComponent}
				<EmptyCard title="You have no receipt items yet">
					Press a button above to add a receipt item
				</EmptyCard>
			</>
		);
	}
	return (
		<>
			{addItemComponent}
			<ReceiptEmptyItems receipt={receipt} itemsRef={itemsRef} />
			{sortedItems.map((item) => (
				<ReceiptItem
					key={item.id}
					item={item}
					receipt={receipt}
					isDisabled={isDisabled}
					ref={(element) => {
						itemsRef.current[item.id] = element;
					}}
				/>
			))}
		</>
	);
};
