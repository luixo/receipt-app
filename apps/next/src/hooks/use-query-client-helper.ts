import React from "react";

import { dehydrate, useQueryClient } from "@tanstack/react-query";

import { alwaysTrue } from "app/utils/utils";

export const useQueryClientHelper = () => {
	const queryClient = useQueryClient();
	React.useEffect(() => {
		if (process.env.NEXT_PUBLIC_ENV !== "test") {
			return;
		}
		window.queryClient = queryClient;
		window.getDehydratedCache = () =>
			dehydrate(queryClient, {
				dehydrateQueries: true,
				dehydrateMutations: true,
				shouldDehydrateQuery: alwaysTrue,
				shouldDehydrateMutation: alwaysTrue,
			});
	}, [queryClient]);
};
