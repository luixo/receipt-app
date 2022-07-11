import React from "react";

import { TRPCQueryOutput } from "../trpc";
import { UsersGetPagedInput } from "../utils/queries/users-get-paged";

import { InboundConnectionIntention } from "./inbound-connection-intention";
import { OutboundConnectionIntention } from "./outbound-connection-intention";
import { Block } from "./utils/block";

type InnerProps = {
	data: TRPCQueryOutput<"account-connection-intentions.get-all">;
	pagedInput: UsersGetPagedInput;
};

export const ConnectionIntentions: React.FC<InnerProps> = ({
	data,
	pagedInput,
}) => {
	if (data.inbound.length === 0 && data.outbound.length === 0) {
		return null;
	}
	return (
		<Block name="Connection intentions">
			{data.inbound.map((intention) => (
				<InboundConnectionIntention
					key={intention.accountId}
					intention={intention}
					pagedInput={pagedInput}
				/>
			))}
			{data.outbound.map((intention) => (
				<OutboundConnectionIntention
					key={intention.accountId}
					intention={intention}
				/>
			))}
		</Block>
	);
};
