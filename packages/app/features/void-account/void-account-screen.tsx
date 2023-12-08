import React from "react";

import { createParam } from "solito";

import { EmptyCard } from "app/components/empty-card";
import { PageHeader } from "app/components/page-header";
import type { AppPage } from "next-app/types/page";

import { VoidAccount } from "./void-account";

const { useParam } = createParam<{ token: string }>();

export const VoidAccountScreen: AppPage = () => {
	const [token] = useParam("token");

	return (
		<>
			<PageHeader>Void account</PageHeader>
			{token ? (
				<VoidAccount token={token} />
			) : (
				<EmptyCard title="Something went wrong">
					Please verify you got void account link right
				</EmptyCard>
			)}
		</>
	);
};
