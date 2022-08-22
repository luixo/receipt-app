import React from "react";

import { createParam } from "solito";

import { PageWithLayout } from "next-app/types/page";

import { UserDebts } from "./user-debts";

const { useParam } = createParam<{ id: string }>();

export const UserDebtsScreen: PageWithLayout = () => {
	const [userId] = useParam("id");
	if (!userId) {
		throw new Error("No user id in param");
	}

	return <UserDebts userId={userId} />;
};
