import React from "react";

import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useMountEffect } from "~app/hooks/use-mount-effect";

export const QueryDevToolsProvider: React.FC<
	React.PropsWithChildren<object>
> = ({ children }) => {
	const [isMounted, { setTrue: setMounted }] = useBooleanState();
	useMountEffect(setMounted);
	return (
		<>
			{children}
			{/* When running with NODE_ENV=test hydration mismatch error appears */}
			{isMounted ? <ReactQueryDevtools /> : null}
		</>
	);
};
