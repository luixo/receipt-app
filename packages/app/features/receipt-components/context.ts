import React from "react";

import type {
	ReceiptContext,
	useActionHooks,
} from "~app/features/receipt/hooks";

export type { ReceiptContext };

export type ActionsHooksContext = ReturnType<typeof useActionHooks>;

export const actionsHooksContext = React.createContext<
	ActionsHooksContext | undefined
>(undefined);

export const useActionsHooksContext = () => {
	const context = React.useContext(actionsHooksContext);
	if (!context) {
		throw new Error("Expected to have receipt actions hooks context!");
	}
	return context;
};

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
