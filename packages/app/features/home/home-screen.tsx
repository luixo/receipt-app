import React from "react";

import { useRouter } from "solito/navigation";

import { Spinner, Text } from "~components";
import type { AppPage } from "~utils";

export const HomeScreen: AppPage = () => {
	const router = useRouter();
	React.useEffect(() => {
		router.replace("/receipts");
	}, [router]);
	return (
		<>
			<Text className="text-2xl">Redirecting to receipt tab..</Text>
			<Spinner size="lg" />
		</>
	);
};
