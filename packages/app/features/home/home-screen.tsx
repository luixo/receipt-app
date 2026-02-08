import React from "react";

import { NavigationContext } from "~app/contexts/navigation-context";
import { Spinner } from "~components/spinner";
import { Text } from "~components/text";

export const HomeScreen = () => {
	const { useNavigate } = React.use(NavigationContext);
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
