import React from "react";

import { Button } from "@nextui-org/react";
import { useQueryClient } from "@tanstack/react-query";
import { FiRefreshCw as RefreshIcon } from "react-icons/fi";

export const RefreshSettings: React.FC = () => {
	const queryClient = useQueryClient();
	const refetch = React.useCallback(
		() => queryClient.invalidateQueries({ refetchType: "all" }),
		[queryClient],
	);
	return (
		<Button color="primary" onClick={refetch}>
			<RefreshIcon />
			Refetch all data
		</Button>
	);
};
