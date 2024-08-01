import React from "react";

import { useQueryClient } from "@tanstack/react-query";

export const QueryDevToolsProvider: React.FC<
	React.PropsWithChildren<object>
> = ({ children }) => {
	const queryClient = useQueryClient();
	const injectDevTools = React.useCallback(async () => {
		if (__DEV__) {
			try {
				const { addPlugin } = await import("react-query-native-devtools");
				addPlugin({ queryClient });
			} catch (e) {
				// eslint-disable-next-line no-console
				console.warn(e);
			}
		}
	}, [queryClient]);
	React.useEffect(() => {
		void injectDevTools();
	}, [injectDevTools]);
	return <>{children}</>;
};
