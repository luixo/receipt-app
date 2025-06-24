import React from "react";

import { Outlet, createFileRoute } from "@tanstack/react-router";

import { ProtectedPage } from "~app/components/protected-page";
import { Spinner } from "~components/spinner";

const Wrapper = () => (
	<ProtectedPage>
		<React.Suspense fallback={<Spinner size="lg" />}>
			<Outlet />
		</React.Suspense>
	</ProtectedPage>
);

export const Route = createFileRoute("/_protected")({
	component: Wrapper,
});
