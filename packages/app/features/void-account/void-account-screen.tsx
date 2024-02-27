import React from "react";

import { useSearchParams } from "solito/navigation";

import { EmptyCard } from "~app/components/empty-card";
import { PageHeader } from "~app/components/page-header";
import type { AppPage } from "~web/types/page";

import { VoidAccount } from "./void-account";

export const VoidAccountScreen: AppPage = () => {
	const searchParams = useSearchParams<{ token: string }>();
	const token = searchParams?.get("token") ?? undefined;

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
