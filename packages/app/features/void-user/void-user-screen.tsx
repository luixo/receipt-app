import { useTranslation } from "react-i18next";

import { EmptyCard } from "#app/components/empty-card.tsx";
import { PageHeader } from "#app/components/page-header.tsx";
import { getPathHooks } from "#app/utils/navigation.tsx";
import { Text } from "#components/text.tsx";

import { VoidUser } from "./void-user";

export const VoidUserScreen = () => {
	const { useQueryState } = getPathHooks("/_public/void-user");
	const [token] = useQueryState("token");
	const { t } = useTranslation("void-user");
	return (
		<>
			<PageHeader>{t("header")}</PageHeader>
			{token ? (
				<VoidUser token={token} />
			) : (
				<EmptyCard title={t("noToken.title")}>
					<Text variant="h3" className="text-center">
						{t("noToken.message")}
					</Text>
				</EmptyCard>
			)}
		</>
	);
};
