import { useTranslation } from "react-i18next";

import { EmptyCard } from "~app/components/empty-card";
import { PageHeader } from "~app/components/page-header";
import { getPathHooks } from "~app/utils/navigation";
import { Text } from "~components/text";

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
