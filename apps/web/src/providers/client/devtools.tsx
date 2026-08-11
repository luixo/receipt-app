import type React from "react";

import { TanStackDevtools } from "@tanstack/react-devtools";
import { formDevtoolsPlugin } from "@tanstack/react-form-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

export const DevToolsProvider: React.FC<React.PropsWithChildren<object>> = ({
	children,
}) => (
	<>
		{children}
		{/* When running with '--mode test' hydration mismatch error appears */}
		<TanStackDevtools
			config={{
				triggerHidden: true,
				openHotkey: ["CtrlOrMeta", "X"],
			}}
			plugins={[
				{
					name: "TanStack Query",
					render: <ReactQueryDevtoolsPanel />,
				},
				{
					name: "TanStack Router",
					render: <TanStackRouterDevtoolsPanel />,
				},
				formDevtoolsPlugin(),
			]}
		/>
	</>
);
