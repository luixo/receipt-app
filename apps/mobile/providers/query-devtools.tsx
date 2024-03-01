import React from "react";

import { useQueryClient } from "@tanstack/react-query";

export const QueryDevToolsProvider: React.FC<
	React.PropsWithChildren<object>
> = ({ children }) => {
	const queryClient = useQueryClient();
	React.useEffect(() => {
		if (__DEV__) {
			// eslint-disable-next-line import/no-extraneous-dependencies
			import("react-query-native-devtools")
				.then(({ addPlugin }) => addPlugin({ queryClient }))
				// eslint-disable-next-line no-console
				.catch(console.warn);
		}
	}, [queryClient]);
	return <>{children}</>;
};
