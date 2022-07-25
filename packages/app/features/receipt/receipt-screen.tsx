import React from "react";

import { Spacer } from "@nextui-org/react";
import { createParam } from "solito";

import { Page } from "app/components/page";
import { ReceiptItems } from "app/features/receipt-items/receipt-items-screen";
import { Currency } from "app/utils/currency";

import { Receipt } from "./receipt";

const { useParam } = createParam<{ id: string }>();

export const ReceiptScreen: React.FC = () => {
	const [id] = useParam("id");
	if (!id) {
		throw new Error("No id in param");
	}

	const deleteLoadingState = React.useState(false);
	const [currency, setCurrency] = React.useState<Currency | undefined>();

	return (
		<Page>
			<Receipt
				deleteLoadingState={deleteLoadingState}
				setCurrency={setCurrency}
				id={id}
			/>
			<Spacer y={1} />
			<ReceiptItems receiptId={id} currency={currency} />
		</Page>
	);
};
