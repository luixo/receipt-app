import React from "react";

import type {
	ReceiptContext as ReceiptContextType,
	useActionHooks,
} from "~app/features/receipt/hooks";

export type ActionsHooksContext = ReturnType<typeof useActionHooks>;

export const ActionsHooksContext = React.createContext<
	ActionsHooksContext | undefined
>(undefined);

export const useActionsHooksContext = () => {
	const context = React.use(ActionsHooksContext);
	if (!context) {
		throw new Error("Expected to have receipt actions hooks context!");
	}
	return context;
};

export const ReceiptContext = React.createContext<
	ReceiptContextType | undefined
>(undefined);

export const useReceiptContext = () => {
	const context = React.use(ReceiptContext);
	if (!context) {
		throw new Error("Expected to have receipt context!");
	}
	return context;
};
