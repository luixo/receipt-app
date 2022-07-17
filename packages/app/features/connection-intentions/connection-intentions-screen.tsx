import React from "react";

import { Block } from "app/components/block";
import { QueryWrapper } from "app/components/query-wrapper";
import { ConnectionIntentions } from "app/features/connection-intentions/connection-intentions";
import { trpc } from "app/trpc";

export const ConnectionIntentionsScreen: React.FC = () => {
	const connectionIntentionsQuery = trpc.useQuery([
		"account-connection-intentions.get-all",
	]);

	return (
		<Block name="Connection intentions">
			<QueryWrapper query={connectionIntentionsQuery}>
				{ConnectionIntentions}
			</QueryWrapper>
		</Block>
	);
};
