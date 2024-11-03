import React from "react";

import type { ReceiptContext } from "~app/features/receipt/hooks";

export { ReceiptContext };

export const receiptContext = React.createContext<ReceiptContext | undefined>(
	undefined,
);

export const useReceiptContext = () => {
	const context = React.useContext(receiptContext);
	if (!context) {
		throw new Error("Expected to have receipt context!");
	}
	return context;
};
