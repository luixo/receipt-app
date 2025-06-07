import type React from "react";
import { View } from "react-native";

import { EmptyCard } from "~app/components/empty-card";
import { QueryErrorMessage } from "~app/components/error-message";
import { PageHeader } from "~app/components/page-header";
import type { TRPCQuerySuccessResult } from "~app/trpc";
import { trpc } from "~app/trpc";
import { Header } from "~components/header";
import { BackLink } from "~components/link";
import { Spinner } from "~components/spinner";

import { InboundConnectionIntention } from "./inbound-connection-intention";
import { OutboundConnectionIntention } from "./outbound-connection-intention";

type Props = {
	query: TRPCQuerySuccessResult<"accountConnectionIntentions.getAll">;
};

const ConnectionIntentionsInner: React.FC<Props> = ({ query: { data } }) => {
	if (data.inbound.length === 0 && data.outbound.length === 0) {
		return (
			<>
				<PageHeader startContent={<BackLink to="/users" />}>
					Connection intentions
				</PageHeader>
				<EmptyCard title="All done 👍" />
			</>
		);
	}
	return (
		<View className="flex flex-col gap-12">
			{data.inbound.length === 0 ? null : (
				<View className="flex flex-col gap-4">
					<Header size="lg">Inbound connections</Header>
					<View className="flex flex-col gap-12">
						{data.inbound.map((intention) => (
							<InboundConnectionIntention
								key={intention.account.id}
								intention={intention}
							/>
						))}
					</View>
				</View>
			)}
			{data.outbound.length === 0 ? null : (
				<View className="flex flex-col gap-4">
					<Header size="lg">Outbound connections</Header>
					<View className="flex flex-col gap-12">
						{data.outbound.map((intention) => (
							<OutboundConnectionIntention
								key={intention.account.id}
								intention={intention}
							/>
						))}
					</View>
				</View>
			)}
		</View>
	);
};

export const ConnectionIntentions: React.FC = () => {
	const query = trpc.accountConnectionIntentions.getAll.useQuery();
	if (query.status === "pending") {
		return <Spinner size="lg" />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <ConnectionIntentionsInner query={query} />;
};
