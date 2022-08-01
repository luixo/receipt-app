import React from "react";

import { Spacer, styled } from "@nextui-org/react";

import { cache } from "app/cache";
import { User } from "app/components/app/user";
import { RemoveButton } from "app/components/remove-button";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { ReceiptItemsId, ReceiptsId } from "next-app/db/models";

import { ReceiptItemPartInput } from "./receipt-item-part-input";

const Wrapper = styled("div", {
	display: "flex",
	alignItems: "flex-start",
	justifyContent: "space-between",
});

const Body = styled("div", {
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",

	"@xsMax": {
		flexDirection: "column",
		alignItems: "flex-end",
	},
});

type ReceiptItem = TRPCQueryOutput<"receipt-items.get">["items"][number];
type ReceiptParticipant =
	TRPCQueryOutput<"receipt-items.get">["participants"][number];
type ReceiptItemParts = ReceiptItem["parts"];

type Props = {
	receiptId: ReceiptsId;
	receiptItemId: ReceiptItemsId;
	participant: ReceiptParticipant;
	itemPart: ReceiptItemParts[number];
	itemParts: number;
	readOnly?: boolean;
	isLoading: boolean;
};

export const ReceiptItemPart: React.FC<Props> = ({
	receiptId,
	receiptItemId,
	itemPart,
	itemParts,
	participant,
	readOnly,
	isLoading,
}) => {
	const deleteMutation = trpc.useMutation(
		"item-participants.delete",
		useTrpcMutationOptions(
			cache.itemParticipants.delete.mutationOptions,
			receiptId
		)
	);
	const removeItemPart = useAsyncCallback(
		() =>
			deleteMutation.mutateAsync({
				itemId: receiptItemId,
				userId: itemPart.userId,
			}),
		[deleteMutation.mutate, receiptItemId, itemPart.userId]
	);

	return (
		<Wrapper>
			<User
				user={{
					id: participant.localUserId || participant.remoteUserId,
					name: participant.name,
				}}
			/>
			<Body>
				<ReceiptItemPartInput
					receiptId={receiptId}
					receiptItemId={receiptItemId}
					itemPart={itemPart}
					itemParts={itemParts}
					readOnly={readOnly}
					isLoading={isLoading || deleteMutation.isLoading}
				/>
				{readOnly ? null : (
					<>
						<Spacer x={1} y={0.5} />
						<RemoveButton
							onRemove={removeItemPart}
							mutation={deleteMutation}
							noConfirm
						/>
					</>
				)}
			</Body>
		</Wrapper>
	);
};
