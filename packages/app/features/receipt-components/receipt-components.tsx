import type React from "react";

import type { TRPCQueryOutput } from "~app/trpc";

import { ReceiptItems } from "./receipt-items";
import { ReceiptParticipants } from "./receipt-participants";

type InnerProps = {
	receipt: TRPCQueryOutput<"receipts.get">;
	isDisabled: boolean;
};

export const ReceiptComponents: React.FC<InnerProps> = ({
	receipt,
	isDisabled,
}) => (
	<>
		<ReceiptParticipants receipt={receipt} isDisabled={isDisabled} />
		<ReceiptItems receipt={receipt} isDisabled={isDisabled} />
	</>
);
