import { UsersId } from "next-app/src/db/models";
import { TRPCQueryOutput, TRPCReactContext } from "../../trpc";
import { ReceiptItemsGetInput } from "./receipt-items";

type ReceiptParticipant =
	TRPCQueryOutput<"receipt-items.get">["participants"][number];

export const getReceiptParticipantWithIndexById = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetInput,
	userId: UsersId
) => {
	const prevData = trpc.getQueryData(["receipt-items.get", input]);
	if (!prevData) {
		return;
	}
	const index = prevData.participants.findIndex(
		(item) => item.userId === userId
	);
	if (index === -1) {
		return;
	}
	return {
		index,
		item: prevData.participants[index]!,
	};
};

export const updateReceiptParticipants = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetInput,
	updater: (participants: ReceiptParticipant[]) => ReceiptParticipant[]
) => {
	const prevData = trpc.getQueryData(["receipt-items.get", input]);
	if (!prevData) {
		return;
	}
	const nextParticipants = updater(prevData.participants);
	if (nextParticipants === prevData.participants) {
		return;
	}
	trpc.setQueryData(["receipt-items.get", input], {
		...prevData,
		participants: nextParticipants,
	});
};
