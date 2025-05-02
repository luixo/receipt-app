import React from "react";

import { useNavigate } from "~app/hooks/use-navigation";
import { Spinner } from "~components/spinner";
import { Text } from "~components/text";

export const HomeScreen: React.FC = () => {
	const navigate = useNavigate();
	React.useEffect(() => {
		navigate({ to: "/receipts", replace: true });
	}, [navigate]);
	return (
		<>
			<Text className="text-2xl">Redirecting to receipt tab..</Text>
			<Spinner size="lg" />
		</>
	);
};
