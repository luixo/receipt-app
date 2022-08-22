import React from "react";

import { createParam } from "solito";

import { PageWithLayout } from "next-app/types/page";

import { Debt } from "./debt";

const { useParam } = createParam<{ id: string }>();

export const DebtScreen: PageWithLayout = () => {
	const [id] = useParam("id");
	if (!id) {
		throw new Error("No id in param");
	}

	return <Debt id={id} />;
};
