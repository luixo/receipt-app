import React from "react";

import { Spacer, styled } from "@nextui-org/react";

import { User } from "app/components/app/user";
import { RemoveButton } from "app/components/remove-button";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { convertParticipantToUser } from "app/utils/receipt-item";
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

type ReceiptItem = TRPCQueryOutput<"receiptItems.get">["items"][number];
type ReceiptParticipant =
	TRPCQueryOutput<"receiptItems.get">["participants"][number];
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
	const removeMutation = trpc.itemParticipants.remove.useMutation(
		useTrpcMutationOptions(mutations.itemParticipants.remove.options, {
			context: receiptId,
		}),
	);
	const removeItemPart = React.useCallback(
		() =>
			removeMutation.mutate({
				itemId: receiptItemId,
				userId: itemPart.userId,
			}),
		[removeMutation, receiptItemId, itemPart.userId],
	);

	return (
		<Wrapper>
			<User user={convertParticipantToUser(participant)} />
			<Body>
				<ReceiptItemPartInput
					receiptId={receiptId}
					receiptItemId={receiptItemId}
					itemPart={itemPart}
					itemParts={itemParts}
					readOnly={readOnly}
					isLoading={isLoading || removeMutation.isLoading}
				/>
				{readOnly ? null : (
					<>
						<Spacer x={1} y={0.5} />
						<RemoveButton
							onRemove={removeItemPart}
							mutation={removeMutation}
							noConfirm
						/>
					</>
				)}
			</Body>
		</Wrapper>
	);
};
