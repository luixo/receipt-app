import React from "react";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { Button } from "~components/button";
import { AddIcon } from "~components/icons";
import type { ReceiptItemsId } from "~db/models";

import { AddReceiptItemForm } from "./add-receipt-item-form";
import { useReceiptContext } from "./context";
import { ReceiptEmptyItems } from "./receipt-empty-items";
import { ReceiptItem } from "./receipt-item";

const AddReceiptItemController: React.FC = () => {
	const { receiptDisabled } = useReceiptContext();
	const [isOpen, { setTrue: openForm }] = useBooleanState();

	if (isOpen) {
		return <AddReceiptItemForm />;
	}
	return (
		<Button
			color="primary"
			variant="bordered"
			onPress={openForm}
			className="w-full"
			disabled={receiptDisabled}
		>
			<AddIcon size={24} />
			Item
		</Button>
	);
};

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
	if (items.length === 0) {
		return (
			<>
				<AddReceiptItemController />
				{emptyReceiptElement}
			</>
		);
	}
	return (
		<>
			<AddReceiptItemController />
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
