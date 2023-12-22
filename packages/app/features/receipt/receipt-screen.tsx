import React from "react";

import { useParams } from "solito/navigation";

import { ReceiptItems } from "app/features/receipt-items/receipt-items-screen";
import type { AppPage } from "next-app/types/page";

import { Receipt } from "./receipt";

export const ReceiptScreen: AppPage = () => {
	const { id } = useParams<{ id: string }>();

	const deleteLoadingState = React.useState(false);

	return (
		<>
			<Receipt deleteLoadingState={deleteLoadingState} id={id} />
			<ReceiptItems receiptId={id} isLoading={deleteLoadingState[0]} />
		</>
	);
};
