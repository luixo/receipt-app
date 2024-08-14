import React from "react";

import { useRouter } from "solito/navigation";

import { Spinner } from "~components/spinner";
import { Text } from "~components/text";
import type { AppPage } from "~utils/next";

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
