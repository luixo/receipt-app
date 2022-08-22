import React from "react";

import { createParam } from "solito";

import { Page } from "app/components/page";

import { Debt } from "./debt";

const { useParam } = createParam<{ id: string }>();

export const DebtScreen: React.FC = () => {
	const [id] = useParam("id");
	if (!id) {
		throw new Error("No id in param");
	}

	return (
		<Page>
			<Debt id={id} />
		</Page>
	);
};
