import React from "react";

import { Spacer } from "@nextui-org/react-tailwind";
import { createParam } from "solito";

import { ReceiptItems } from "app/features/receipt-items/receipt-items-screen";
import type { AppPage } from "next-app/types/page";

import { Receipt } from "./receipt";

const { useParam } = createParam<{ id: string }>();

export const ReceiptScreen: AppPage = () => {
	const [id] = useParam("id");
	if (!id) {
		throw new Error("No id in param");
	}

	const deleteLoadingState = React.useState(false);

	return (
		<>
			<Receipt deleteLoadingState={deleteLoadingState} id={id} />
			<Spacer y={4} />
			<ReceiptItems receiptId={id} isLoading={deleteLoadingState[0]} />
		</>
	);
};
