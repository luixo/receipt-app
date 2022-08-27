import React from "react";

import { Container, Loading, Spacer, styled, Text } from "@nextui-org/react";

import { QueryErrorMessage } from "app/components/error-message";
import { trpc, TRPCQuerySuccessResult } from "app/trpc";

import { InboundDebtIntentions } from "./inbound-debt-intentions";
import { OutboundDebtIntentions } from "./outbound-debt-intentions";

const CenteredText = styled(Text, {
	display: "flex",
	alignItems: "center",
});

type Props = {
	query: TRPCQuerySuccessResult<"debts-sync-intentions.get-all">;
};

const DebtIntentionsInner: React.FC<Props> = ({ query: { data } }) => {
	if (data.inbound.length === 0 && data.outbound.length === 0) {
		return (
			<Container
				display="flex"
				direction="column"
				alignItems="center"
				justify="center"
			>
				<Text h2>You have no debt intentions</Text>
				<Spacer y={1} />
				<CenteredText h3>Add a debt and sync it with a user</CenteredText>
			</Container>
		);
	}
	return (
		<>
			{data.inbound.length === 0 ? null : (
				<InboundDebtIntentions intentions={data.inbound} />
			)}
			{data.outbound.length === 0 ? null : (
				<>
					<Spacer y={1} />
					<OutboundDebtIntentions intentions={data.outbound} />
				</>
			)}
		</>
	);
};

export const DebtIntentions: React.FC = () => {
	const query = trpc.useQuery(["debts-sync-intentions.get-all"]);
	if (query.status === "loading") {
		return <Loading size="xl" />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	if (query.status === "idle") {
		return null;
	}
	return <DebtIntentionsInner query={query} />;
};
