import { createRef } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";
import { ReceiptsId } from "next-app/db/models";

import { createController } from "./controller";
import { ReceiptParticipants } from "./types";

export const update = (
	trpc: TRPCReactContext,
	receiptId: ReceiptsId,
	updater: (user: ReceiptParticipants) => ReceiptParticipants
) => {
	const modifiedParticipantsRef = createRef<ReceiptParticipants | undefined>();
	createController(trpc, receiptId).update((user) => {
		modifiedParticipantsRef.current = user;
		return updater(user);
	});
	return modifiedParticipantsRef.current;
};
