import React from "react";

import { Spinner } from "@nextui-org/react";

import { Header } from "app/components/base/header";
import { EmptyCard } from "app/components/empty-card";
import { QueryErrorMessage } from "app/components/error-message";
import type { TRPCQuerySuccessResult } from "app/trpc";
import { trpc } from "app/trpc";

import { InboundConnectionIntention } from "./inbound-connection-intention";
import { OutboundConnectionIntention } from "./outbound-connection-intention";

type Props = {
	query: TRPCQuerySuccessResult<"accountConnectionIntentions.getAll">;
};

const ConnectionIntentionsInner: React.FC<Props> = ({ query: { data } }) => {
	if (data.inbound.length === 0 && data.outbound.length === 0) {
		return (
			<EmptyCard title="You have no intention connections">
				Add a user with an email or add an email to existing user
			</EmptyCard>
		);
	}
	return (
		<>
			{data.inbound.length === 0 ? null : (
				<>
					<Header size="lg">Inbound connections</Header>
					{data.inbound.map((intention) => (
						<InboundConnectionIntention
							key={intention.account.id}
							intention={intention}
						/>
					))}
				</>
			)}
			{data.outbound.length === 0 ? null : (
				<>
					<Header size="lg">Outbound connections</Header>
					{data.outbound.map((intention) => (
						<OutboundConnectionIntention
							key={intention.account.id}
							intention={intention}
						/>
					))}
				</>
			)}
		</>
	);
};

export const ConnectionIntentions: React.FC = () => {
	const query = trpc.accountConnectionIntentions.getAll.useQuery();
	if (query.status === "loading") {
		return <Spinner size="lg" />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <ConnectionIntentionsInner query={query} />;
};
