import React from "react";

import { createParam } from "solito";

import { AppPage } from "next-app/types/page";

import { DebtsExchangeAll } from "./debts-exchange-all";

const { useParam } = createParam<{ id: string }>();

export const DebtsExchangeAllScreen: AppPage = () => {
	const [userId] = useParam("id");
	if (!userId) {
		throw new Error("No user id in param");
	}

	return <DebtsExchangeAll userId={userId} />;
};
