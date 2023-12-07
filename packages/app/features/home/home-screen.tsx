import React from "react";

import { Loading } from "@nextui-org/react";
import { Spacer } from "@nextui-org/react-tailwind";

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
			<Spacer y={4} />
			<Loading size="xl" />
		</>
	);
};
