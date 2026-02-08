import React from "react";

import { useSuspenseQuery } from "@tanstack/react-query";

import { suspendedFallback } from "~app/components/suspense-wrapper";
import { NavigationContext } from "~app/contexts/navigation-context";
import { HomeScreen } from "~app/features/home/home-screen";
import { useTRPC } from "~app/utils/trpc";
import { Spinner } from "~components/spinner";

const RedirectPage: React.FC = suspendedFallback(
	() => {
		const trpc = useTRPC();
		useSuspenseQuery(trpc.account.get.queryOptions());
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

const Wrapper = () => <RedirectPage />;

export default Wrapper;
