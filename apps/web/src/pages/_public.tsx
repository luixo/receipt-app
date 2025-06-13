import React from "react";

import { Outlet, createFileRoute } from "@tanstack/react-router";

import { PublicPage } from "~app/components/public-page";
import { Spinner } from "~components/spinner";

const Wrapper = () => (
	<PublicPage>
		<React.Suspense fallback={<Spinner size="lg" />}>
			<Outlet />
		</React.Suspense>
	</PublicPage>
);

export const Route = createFileRoute("/_public")({
	component: Wrapper,
});
