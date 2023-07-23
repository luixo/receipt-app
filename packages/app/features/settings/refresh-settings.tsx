import React from "react";

import { Button } from "@nextui-org/react";
import { FiRefreshCw as RefreshIcon } from "react-icons/fi";

import { trpc } from "app/trpc";

export const RefreshSettings: React.FC = () => {
	const trpcContext = trpc.useContext();
	const refetch = React.useCallback(
		() => trpcContext.queryClient.invalidateQueries({ refetchType: "all" }),
		[trpcContext],
	);
	return (
		<Button size="lg" icon={<RefreshIcon />} onClick={refetch} auto>
			Refetch all data
		</Button>
	);
};
