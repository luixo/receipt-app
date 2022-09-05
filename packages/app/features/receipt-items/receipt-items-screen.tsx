import React from "react";

import { Collapse, Loading, Spacer, styled, Text } from "@nextui-org/react";

import { QueryErrorMessage } from "app/components/error-message";
import { AddReceiptItemController } from "app/features/add-receipt-item/add-receipt-item-controller";
import { ReceiptParticipants } from "app/features/receipt-participants/receipt-participants";
import { trpc, TRPCQuerySuccessResult } from "app/trpc";
import { ReceiptsId } from "next-app/db/models";

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
	const receiptQuery = trpc.useQuery(["receipts.get", { id: receiptId }]);
	const receiptLocked =
		receiptQuery.status === "success" ? receiptQuery.data.locked : true;
	const receiptCurrency =
		receiptQuery.status === "success" ? receiptQuery.data.currency : undefined;
	return (
		<Collapse.Group accordion={false} divider={false}>
			<Collapse
				title="🥸 Participants"
				shadow
				expanded={
					data.participants.length === 0 ? data.role === "owner" : undefined
				}
			>
				<ReceiptParticipants
					data={data}
					receiptId={receiptId}
					receiptLocked={receiptLocked}
					currency={receiptCurrency}
					isLoading={isLoading}
				/>
			</Collapse>
			<Spacer y={1} />
			<AddReceiptItemController
				receiptId={receiptId}
				receiptLocked={receiptLocked}
				isLoading={isLoading}
			/>
			<Spacer y={1} />
			{data.items.map((receiptItem, index) => (
				<React.Fragment key={receiptItem.id}>
					{index === 0 ? null : <Spacer y={1} />}
					<ReceiptItem
						receiptId={receiptId}
						receiptLocked={receiptLocked}
						receiptItem={receiptItem}
						receiptParticipants={data.participants}
						currency={receiptCurrency}
						role={data.role}
						isLoading={isLoading}
					/>
				</React.Fragment>
			))}
			{data.items.length === 0 ? (
				<NoReceiptItems>
					<Text h3>You have no receipt items yet</Text>
					<Spacer y={1} />
					<Text h4>Press a button above to add a receipt item</Text>
				</NoReceiptItems>
			) : null}
		</Collapse.Group>
	);
};

type Props = Omit<InnerProps, "query">;

export const ReceiptItems: React.FC<Props> = ({ receiptId, ...props }) => {
	const query = trpc.useQuery(["receiptItems.get", { receiptId }]);
	if (query.status === "loading") {
		return <Loading />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	if (query.status === "idle") {
		return null;
	}
	return <ReceiptItemsInner {...props} receiptId={receiptId} query={query} />;
};
