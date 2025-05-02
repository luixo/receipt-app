import type React from "react";

import { EmptyCard } from "~app/components/empty-card";
import { PageHeader } from "~app/components/page-header";

import { VoidAccount } from "./void-account";

export const VoidAccountScreen: React.FC<{
	token?: string;
}> = ({ token }) => (
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
