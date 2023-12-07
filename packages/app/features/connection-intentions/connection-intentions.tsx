import React from "react";

import { Container, Loading, Spacer } from "@nextui-org/react";

import { Text } from "app/components/base/text";
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
			<Container
				display="flex"
				direction="column"
				alignItems="center"
				justify="center"
			>
				<Text className="text-center text-4xl font-medium">
					You have no intention connections
				</Text>
				<Spacer y={1} />
				<Text className="text-2xl font-medium">
					Add a user with an email or add an email to existing user
				</Text>
			</Container>
		);
	}
	return (
		<>
			{data.inbound.length === 0 ? null : (
				<>
					<Text className="text-center text-4xl font-medium">
						Inbound connections
					</Text>
					<Spacer y={0.5} />
					{data.inbound.map((intention, index) => (
						<React.Fragment key={intention.account.id}>
							{index === 0 ? null : <Spacer y={1.5} />}
							<InboundConnectionIntention intention={intention} />
						</React.Fragment>
					))}
				</>
			)}
			{data.inbound.length !== 0 && data.outbound.length !== 0 ? (
				<Spacer y={1} />
			) : null}
			{data.outbound.length === 0 ? null : (
				<>
					<Text className="text-center text-4xl font-medium">
						Outbound connections
					</Text>
					<Spacer y={1} />
					{data.outbound.map((intention, index) => (
						<React.Fragment key={intention.account.id}>
							{index === 0 ? null : <Spacer y={1} />}
							<OutboundConnectionIntention intention={intention} />
						</React.Fragment>
					))}
				</>
			)}
		</>
	);
};

export const ConnectionIntentions: React.FC = () => {
	const query = trpc.accountConnectionIntentions.getAll.useQuery();
	if (query.status === "loading") {
		return <Loading size="xl" />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <ConnectionIntentionsInner query={query} />;
};
