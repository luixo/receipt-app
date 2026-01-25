import React from "react";

import { Trans, useTranslation } from "react-i18next";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { Button } from "~components/button";
import { Icon } from "~components/icons";
import type { ViewHandle } from "~components/view.base";
import type { ReceiptItemId } from "~db/ids";
import { compare } from "~utils/date";

import { AddReceiptItemForm } from "./add-receipt-item-form";
import { useReceiptContext } from "./context";
import { ReceiptEmptyItems } from "./receipt-empty-items";
import { ReceiptItem, ReceiptItemSkeleton } from "./receipt-item";

export const SkeletonAddReceiptItemController = () => {
	const { t } = useTranslation("receipts");
	return (
		<Button color="primary" variant="bordered" className="w-full" isDisabled>
			<Trans
				t={t}
				i18nKey="add.addItemButton"
				components={{
					icon: <Icon name="add" className="size-6" />,
				}}
			/>
		</Button>
	);
};

const AddReceiptItemController: React.FC = () => {
	const { t } = useTranslation("receipts");
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
			isDisabled={receiptDisabled}
		>
			<Trans
				t={t}
				i18nKey="add.addItemButton"
				components={{
					icon: <Icon name="add" className="size-6" />,
				}}
			/>
		</Button>
	);
};

export const ReceiptItems: React.FC = () => {
	const { items, emptyReceiptElement } = useReceiptContext();
	const itemsRef = React.useRef<Record<ReceiptItemId, ViewHandle | null>>({});
	const sortedItems = React.useMemo(
		() =>
			items.toSorted((a, b) => compare.zonedDateTime(a.createdAt, b.createdAt)),
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

export const ReceiptItemsSkeleton: React.FC<{ amount: number }> = ({
	amount,
}) => {
	const items = React.useMemo(
		() => new Array(amount).fill(null).map((_, index) => index),
		[amount],
	);
	return (
		<>
			{items.map((index) => (
				<ReceiptItemSkeleton key={index} />
			))}
		</>
	);
};
