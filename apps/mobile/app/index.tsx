import React from "react";

import { useSuspenseQuery } from "@tanstack/react-query";

import { PageWrapper } from "#app/components/page-wrapper.tsx";
import { suspendedFallback } from "#app/components/suspense-wrapper.tsx";
import { NavigationContext } from "#app/contexts/navigation-context.ts";
import { HomeScreen } from "#app/features/home/home-screen.tsx";
import { useTRPC } from "#app/utils/trpc.ts";
import { Spinner } from "#components/spinner.tsx";

const RedirectPage: React.FC = suspendedFallback(
	() => {
		const trpc = useTRPC();
		useSuspenseQuery(trpc.user.get.queryOptions());
		return <HomeScreen />;
	},
	<Spinner size="lg" />,
	() => {
		const { useNavigate } = React.use(NavigationContext);
		const navigate = useNavigate();
		React.useEffect(() => {
			navigate({ to: "/login", replace: true });
		}, [navigate]);
		return null;
	},
);

const Wrapper = () => (
	<PageWrapper>
		<RedirectPage />
	</PageWrapper>
);

export default Wrapper;
