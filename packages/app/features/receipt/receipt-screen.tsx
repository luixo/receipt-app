import React from "react";

import { useParams } from "solito/navigation";

import type { AppPage } from "~web/types/page";

import { Receipt } from "./receipt";

export const ReceiptScreen: AppPage = () => {
	const { id } = useParams<{ id: string }>();
	return <Receipt id={id} />;
};
