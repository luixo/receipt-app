import React from "react";

import { createParam } from "solito";

import { AppPage } from "next-app/types/page";

import { DebtsExchange } from "./debts-exchange";

const { useParam } = createParam<{ id: string }>();

export const DebtsExchangeScreen: AppPage = () => {
	const [userId] = useParam("id");
	if (!userId) {
		throw new Error("No user id in param");
	}

	return <DebtsExchange userId={userId} />;
};
