import React from "react";

import { Loading, Spacer, Text } from "@nextui-org/react";

import { useRouter } from "app/hooks/use-router";
import type { AppPage } from "next-app/types/page";

export const HomeScreen: AppPage = () => {
	const router = useRouter();
	React.useEffect(() => {
		void router.replace("/receipts");
	}, [router]);
	return (
		<>
			<Text h3>Redirecting to receipt tab..</Text>
			<Spacer y={1} />
			<Loading size="xl" />
		</>
	);
};
