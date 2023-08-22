import React from "react";

import { createParam } from "solito";

import type { AppPage } from "next-app/types/page";

import { Debt } from "./debt";

const { useParam } = createParam<{ id: string }>();

export const DebtScreen: AppPage = () => {
	const [id] = useParam("id");
	if (!id) {
		throw new Error("No id in param");
	}

	return <Debt id={id} />;
};
