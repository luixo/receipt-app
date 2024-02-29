import React from "react";

import { useQueryClient } from "@tanstack/react-query";

import { Button } from "~components";
import { RefreshIcon } from "~components/icons";

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
