import React from "react";

import { EmptyCard } from "~app/components/empty-card";
import { PageHeader } from "~app/components/page-header";
import { useQueryState } from "~app/hooks/use-navigation";
import type { AppPage } from "~utils/next";

import { VoidAccount } from "./void-account";

export const VoidAccountScreen: AppPage = () => {
	const [token] = useQueryState("token");

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
