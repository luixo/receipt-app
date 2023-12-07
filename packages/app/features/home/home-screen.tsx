import React from "react";

import { Loading, Spacer } from "@nextui-org/react";

import { Text } from "app/components/base/text";
import { useRouter } from "app/hooks/use-router";
import type { AppPage } from "next-app/types/page";

export const HomeScreen: AppPage = () => {
	const router = useRouter();
	React.useEffect(() => {
		void router.replace("/receipts");
	}, [router]);
	return (
		<>
			<Text className="text-2xl">Redirecting to receipt tab..</Text>
			<Spacer y={1} />
			<Loading size="xl" />
		</>
	);
};
