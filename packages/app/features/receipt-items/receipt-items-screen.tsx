import React from "react";
import { View } from "react-native";

import { EmptyCard } from "~app/components/empty-card";
import { AddReceiptItemController } from "~app/features/add-receipt-item/add-receipt-item-controller";
import { ReceiptParticipants } from "~app/features/receipt-participants/receipt-participants";
import { useFormattedCurrency } from "~app/hooks/use-formatted-currency";
import type { TRPCQueryOutput } from "~app/trpc";
import { Checkbox, Header } from "~components";
import { ArrowDown } from "~components/icons";
import type { ReceiptItemsId } from "~db/models";
import { round } from "~utils/math";

import { ReceiptItem } from "./receipt-item";

type InnerProps = {
	receipt: TRPCQueryOutput<"receipts.get">;
	isLoading: boolean;
};

export const ReceiptItems: React.FC<InnerProps> = ({ receipt, isLoading }) => {
	const receiptLocked = Boolean(receipt.lockedTimestamp);
	const receiptCurrencyCode = receipt.currencyCode;
	const currency = useFormattedCurrency(receiptCurrencyCode);
	const emptyItems = receipt.items.filter((item) => item.parts.length === 0);
	const itemsRef = React.useRef<Record<ReceiptItemsId, HTMLDivElement | null>>(
		{},
	);
	const onEmptyItemClick = React.useCallback(
		(id: ReceiptItemsId) => {
			const matchedItem = itemsRef.current[id];
			if (!matchedItem) {
				return;
			}
			matchedItem.scrollIntoView();
		},
		[itemsRef],
	);
	const sortedItems = React.useMemo(
		() =>
			receipt.items.toSorted(
				(a, b) => a.created.valueOf() - b.created.valueOf(),
			),
		[receipt.items],
	);
	return (
		<>
			{emptyItems.length === 0 ? null : (
				<View className="gap-2">
					<Header size="sm">Items with no participants</Header>
					{emptyItems.map((item) => (
						<Checkbox
							key={item.id}
							color="warning"
							isSelected
							onChange={() => onEmptyItemClick(item.id)}
							icon={<ArrowDown />}
						>
							{`"${item.name}" — ${round(
								item.quantity * item.price,
							)} ${currency}`}
						</Checkbox>
					))}
				</View>
			)}
			<ReceiptParticipants
				items={receipt.items}
				participants={receipt.participants}
				receiptId={receipt.id}
				receiptLocked={receiptLocked}
				receiptInTransfer={Boolean(receipt.transferIntentionUserId)}
				receiptSelfUserId={receipt.selfUserId}
				currencyCode={receipt.currencyCode}
				isOwner={receipt.selfUserId === receipt.ownerUserId}
				isLoading={isLoading}
			/>
			<AddReceiptItemController
				receiptId={receipt.id}
				receiptLocked={receiptLocked}
				isLoading={isLoading}
			/>
			{sortedItems.map((item) => (
				<ReceiptItem
					key={item.id}
					receiptId={receipt.id}
					item={item}
					isLoading={isLoading}
					selfUserId={receipt.selfUserId}
					receiptLocked={receiptLocked}
					currencyCode={receipt.currencyCode}
					participants={receipt.participants}
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
