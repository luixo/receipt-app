import React from "react";
import { View } from "react-native";

import { Checkbox, Spinner } from "@nextui-org/react";
import { FaArrowDown as ArrowDown } from "react-icons/fa";

import { Header } from "app/components/base/header";
import { EmptyCard } from "app/components/empty-card";
import { QueryErrorMessage } from "app/components/error-message";
import { AddReceiptItemController } from "app/features/add-receipt-item/add-receipt-item-controller";
import { ReceiptParticipants } from "app/features/receipt-participants/receipt-participants";
import { useFormattedCurrency } from "app/hooks/use-formatted-currency";
import type { TRPCQuerySuccessResult } from "app/trpc";
import { trpc } from "app/trpc";
import { round } from "app/utils/math";
import type { ReceiptItemsId, ReceiptsId } from "next-app/db/models";

import { ReceiptItem } from "./receipt-item";

type InnerProps = {
	receiptId: ReceiptsId;
	query: TRPCQuerySuccessResult<"receiptItems.get">;
	isLoading: boolean;
};

export const ReceiptItemsInner: React.FC<InnerProps> = ({
	query: { data },
	receiptId,
	isLoading,
}) => {
	const receiptQuery = trpc.receipts.get.useQuery({ id: receiptId });
	const receiptLocked =
		receiptQuery.status === "success"
			? Boolean(receiptQuery.data.lockedTimestamp)
			: true;
	const receiptCurrencyCode =
		receiptQuery.status === "success"
			? receiptQuery.data.currencyCode
			: undefined;
	const currency = useFormattedCurrency(receiptCurrencyCode);
	const receiptSelfUserId =
		receiptQuery.status === "success"
			? receiptQuery.data.selfUserId
			: undefined;
	const emptyItems = data.items.filter((item) => item.parts.length === 0);
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
				data={data}
				receiptId={receiptId}
				receiptSelfUserId={receiptSelfUserId}
				receiptLocked={receiptLocked}
				currencyCode={receiptCurrencyCode}
				isLoading={isLoading}
			/>
			<AddReceiptItemController
				receiptId={receiptId}
				receiptLocked={receiptLocked}
				isLoading={isLoading}
			/>
			{data.items.map((receiptItem) => (
				<ReceiptItem
					key={receiptItem.id}
					receiptId={receiptId}
					receiptLocked={receiptLocked}
					receiptItem={receiptItem}
					receiptParticipants={data.participants}
					currencyCode={receiptCurrencyCode}
					role={data.role}
					isLoading={isLoading}
					ref={(element) => {
						itemsRef.current[receiptItem.id] = element;
					}}
				/>
			))}
			{data.items.length === 0 ? (
				<EmptyCard title="You have no receipt items yet">
					Press a button above to add a receipt item
				</EmptyCard>
			) : null}
		</>
	);
};

type Props = Omit<InnerProps, "query">;

export const ReceiptItems: React.FC<Props> = ({ receiptId, ...props }) => {
	const query = trpc.receiptItems.get.useQuery({ receiptId });
	if (query.status === "loading") {
		return <Spinner />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <ReceiptItemsInner {...props} receiptId={receiptId} query={query} />;
};
