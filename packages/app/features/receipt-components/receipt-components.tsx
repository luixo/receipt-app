import type React from "react";

import type {
	ActionsHooksContext,
	ReceiptContext,
} from "~app/features/receipt-components/context";
import {
	actionsHooksContext,
	receiptContext,
} from "~app/features/receipt-components/context";

import { ReceiptItems } from "./receipt-items";
import { ReceiptParticipants } from "./receipt-participants";

type InnerProps = {
	receipt: ReceiptContext;
	actionsHooks: ActionsHooksContext;
};

export const ReceiptComponents: React.FC<InnerProps> = ({
	receipt,
	actionsHooks,
}) => (
	<receiptContext.Provider value={receipt}>
		<actionsHooksContext.Provider value={actionsHooks}>
			<ReceiptParticipants />
			<ReceiptItems />
		</actionsHooksContext.Provider>
	</receiptContext.Provider>
);
