import React from "react";

import { Container, Loading, Spacer, styled, Text } from "@nextui-org/react";

import { QueryErrorMessage } from "app/components/error-message";
import { trpc, TRPCQuerySuccessResult } from "app/trpc";

import { InboundConnectionIntention } from "./inbound-connection-intention";
import { OutboundConnectionIntention } from "./outbound-connection-intention";

const CenteredText = styled(Text, {
	display: "flex",
	alignItems: "center",
});

type Props = {
	query: TRPCQuerySuccessResult<"account-connection-intentions.get-all">;
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
				<Text h2>You have no intention connections</Text>
				<Spacer y={1} />
				<CenteredText h3>
					Add a user with an email or add an email to existing user
				</CenteredText>
			</Container>
		);
	}
	return (
		<>
			{data.inbound.length === 0 ? null : (
				<>
					<CenteredText h2>Inbound connections</CenteredText>
					<Spacer y={0.5} />
					{data.inbound.map((intention, index) => (
						<React.Fragment key={intention.accountId}>
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
					<CenteredText h2>Outbound connections</CenteredText>
					<Spacer y={1} />
					{data.outbound.map((intention, index) => (
						<React.Fragment key={intention.accountId}>
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
	const query = trpc.useQuery(["account-connection-intentions.get-all"]);
	if (query.status === "loading") {
		return <Loading size="xl" />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	if (query.status === "idle") {
		return null;
	}
	return <ConnectionIntentionsInner query={query} />;
};
