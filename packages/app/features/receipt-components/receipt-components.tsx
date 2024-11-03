import type React from "react";

import type { ReceiptContext } from "~app/features/receipt-components/context";
import { receiptContext } from "~app/features/receipt-components/context";

import { ReceiptItems } from "./receipt-items";
import { ReceiptParticipants } from "./receipt-participants";

type Props = {
	receipt: ReceiptContext;
};

export const ReceiptComponents: React.FC<Props> = ({ receipt }) => (
	<receiptContext.Provider value={receipt}>
		<ReceiptParticipants />
		<ReceiptItems />
	</receiptContext.Provider>
);
