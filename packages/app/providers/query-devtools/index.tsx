import React from "react";

export const QueryDevToolsProvider: React.FC<
	React.PropsWithChildren<object>
> = ({ children }) => (
	//  see https://github.com/bgaleotti/react-query-native-devtools/tree/main/packages/react-query-native-devtools
	<>{children}</>
);
