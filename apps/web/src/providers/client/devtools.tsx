import type React from "react";

import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useMountEffect } from "~app/hooks/use-mount-effect";

export const DevToolsProvider: React.FC<React.PropsWithChildren<object>> = ({
	children,
}) => {
	const [isMounted, { setTrue: setMounted }] = useBooleanState();
	useMountEffect(setMounted);
	return (
		<>
			{children}
			{/* When running with '--mode test' hydration mismatch error appears */}
			{isMounted ? <ReactQueryDevtools /> : null}
			{isMounted ? <TanStackRouterDevtools /> : null}
		</>
	);
};
