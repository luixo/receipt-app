import React from "react";

import type { ReceiptItemsId } from "~db/models";

import { AddReceiptItemController } from "./add-receipt-item-controller";
import { useReceiptContext } from "./context";
import { ReceiptEmptyItems } from "./receipt-empty-items";
import { ReceiptItem } from "./receipt-item";

export const ReceiptItems: React.FC = () => {
	const { items, emptyReceiptElement } = useReceiptContext();
	const itemsRef = React.useRef<Record<ReceiptItemsId, HTMLDivElement | null>>(
		{},
	);
	const sortedItems = React.useMemo(
		() =>
			items.toSorted((a, b) => a.createdAt.valueOf() - b.createdAt.valueOf()),
		[items],
	);
	const addItemComponent = <AddReceiptItemController />;
	if (items.length === 0) {
		return (
			<>
				{addItemComponent}
				{emptyReceiptElement}
			</>
		);
	}
	return (
		<>
			{addItemComponent}
			<ReceiptEmptyItems itemsRef={itemsRef} />
			{sortedItems.map((item) => (
				<ReceiptItem
					key={item.id}
					item={item}
					ref={(element) => {
						itemsRef.current[item.id] = element;
					}}
				/>
			))}
		</>
	);
};
