import React from "react";

import { Loading, Spacer, Text } from "@nextui-org/react";
import { useRouter } from "solito/router";

import { ProtectedPage } from "app/components/protected-page";
import { AppPage } from "next-app/types/page";

export const HomeScreen: AppPage = () => {
	const router = useRouter();
	const gotoReceipts = React.useCallback(
		() => router.replace("/receipts"),
		[router]
	);
	return (
		<ProtectedPage onData={gotoReceipts}>
			<Text h3>Redirecting to receipt tab..</Text>
			<Spacer y={1} />
			<Loading size="xl" />
		</ProtectedPage>
	);
};
