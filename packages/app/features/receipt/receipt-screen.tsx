import React from "react";

import { Spacer } from "@nextui-org/react";
import { createParam } from "solito";

import { Page } from "app/components/page";
import { ReceiptItems } from "app/features/receipt-items/receipt-items-screen";

import { Receipt } from "./receipt";

const { useParam } = createParam<{ id: string }>();

export const ReceiptScreen: React.FC = () => {
	const [id] = useParam("id");
	if (!id) {
		throw new Error("No id in param");
	}

	const deleteLoadingState = React.useState(false);

	return (
		<Page>
			<Receipt deleteLoadingState={deleteLoadingState} id={id} />
			<Spacer y={1} />
			<ReceiptItems receiptId={id} />
		</Page>
	);
};
