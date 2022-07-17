import React from "react";

import { TRPCQueryOutput } from "app/trpc";

import { InboundConnectionIntention } from "./inbound-connection-intention";
import { OutboundConnectionIntention } from "./outbound-connection-intention";

type InnerProps = {
	data: TRPCQueryOutput<"account-connection-intentions.get-all">;
};

export const ConnectionIntentions: React.FC<InnerProps> = ({ data }) => {
	if (data.inbound.length === 0 && data.outbound.length === 0) {
		return null;
	}
	return (
		<>
			{data.inbound.map((intention) => (
				<InboundConnectionIntention
					key={intention.accountId}
					intention={intention}
				/>
			))}
			{data.outbound.map((intention) => (
				<OutboundConnectionIntention
					key={intention.accountId}
					intention={intention}
				/>
			))}
		</>
	);
};
