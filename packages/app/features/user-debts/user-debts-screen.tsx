import React from "react";

import { createParam } from "solito";

import { Page } from "app/components/page";

import { UserDebts } from "./user-debts";

const { useParam } = createParam<{ id: string }>();

export const UserDebtsScreen: React.FC = () => {
	const [userId] = useParam("id");
	if (!userId) {
		throw new Error("No user id in param");
	}

	return (
		<Page>
			<UserDebts userId={userId} />
		</Page>
	);
};
