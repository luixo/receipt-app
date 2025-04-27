import React from "react";

import { useNavigate } from "~app/hooks/use-navigation";
import { Spinner } from "~components/spinner";
import { Text } from "~components/text";
import type { AppPage } from "~utils/next";

export const HomeScreen: AppPage = () => {
	const navigate = useNavigate();
	React.useEffect(() => {
		navigate("/receipts", { replace: true });
	}, [navigate]);
	return (
		<>
			<Text className="text-2xl">Redirecting to receipt tab..</Text>
			<Spinner size="lg" />
		</>
	);
};
