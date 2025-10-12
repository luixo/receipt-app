import type React from "react";

import { TanStackDevtools } from "@tanstack/react-devtools";
import { FormDevtoolsPlugin } from "@tanstack/react-form-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useHotkey } from "~app/hooks/use-hotkey";

export const DevToolsProvider: React.FC<React.PropsWithChildren<object>> = ({
	children,
}) => {
	const [isMounted, { switchValue: switchMounted }] = useBooleanState();
	useHotkey(["shift"], "x", switchMounted);
	return (
		<>
			{children}
			{/* When running with '--mode test' hydration mismatch error appears */}
			{isMounted ? (
				<TanStackDevtools
					// config={{ triggerHidden: import.meta.env.MODE === "test" }}
					plugins={[
						{
							name: "TanStack Query",
							render: <ReactQueryDevtoolsPanel />,
						},
						{
							name: "TanStack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
						FormDevtoolsPlugin(),
					]}
				/>
			) : null}
		</>
	);
};
