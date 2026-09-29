import React from "react";

import { useTranslation } from "react-i18next";

import { NavigationContext } from "#app/contexts/navigation-context.ts";
import { Spinner } from "#components/spinner.tsx";
import { Text } from "#components/text.tsx";

export const HomeScreen = () => {
	const { useNavigate } = React.use(NavigationContext);
	const navigate = useNavigate();
	const { t } = useTranslation("default");
	React.useEffect(() => {
		navigate({ to: "/receipts", replace: true });
	}, [navigate]);
	return (
		<>
			<Text className="text-2xl">{t("misc.redirect")}</Text>
			<Spinner size="lg" />
		</>
	);
};
