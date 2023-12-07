import React from "react";

import { styled } from "@nextui-org/react";
import { Spacer, Spinner } from "@nextui-org/react-tailwind";

import { Text } from "app/components/base/text";
import { QueryErrorMessage } from "app/components/error-message";
import { AddReceiptItemController } from "app/features/add-receipt-item/add-receipt-item-controller";
import { ReceiptParticipants } from "app/features/receipt-participants/receipt-participants";
import type { TRPCQuerySuccessResult } from "app/trpc";
import { trpc } from "app/trpc";
import type { ReceiptItemsId, ReceiptsId } from "next-app/db/models";

import { EmptyItems } from "./empty-items";
import { ReceiptItem } from "./receipt-item";

const NoReceiptItems = styled("div", {
	textAlign: "center",
});

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
				<>
					<EmptyItems
						items={emptyItems}
						currencyCode={receiptCurrencyCode}
						onClick={onEmptyItemClick}
					/>
					<Spacer y={4} />
				</>
			)}
			<ReceiptParticipants
				data={data}
				receiptId={receiptId}
				receiptSelfUserId={receiptSelfUserId}
				receiptLocked={receiptLocked}
				currencyCode={receiptCurrencyCode}
				isLoading={isLoading}
			/>
			<Spacer y={4} />
			<AddReceiptItemController
				receiptId={receiptId}
				receiptLocked={receiptLocked}
				isLoading={isLoading}
			/>
			{data.items.map((receiptItem) => (
				<React.Fragment key={receiptItem.id}>
					<Spacer y={4} />
					<ReceiptItem
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
				</React.Fragment>
			))}
			{data.items.length === 0 ? (
				<>
					<Spacer y={4} />
					<NoReceiptItems>
						<Text className="text-2xl font-medium">
							You have no receipt items yet
						</Text>
						<Spacer y={4} />
						<Text className="text-xl">
							Press a button above to add a receipt item
						</Text>
					</NoReceiptItems>
				</>
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
