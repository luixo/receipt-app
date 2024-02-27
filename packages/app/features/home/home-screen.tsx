import React from "react";

import { Spinner } from "@nextui-org/react";
import { useRouter } from "solito/navigation";

import { Text } from "~app/components/base/text";
import type { AppPage } from "~web/types/page";

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
