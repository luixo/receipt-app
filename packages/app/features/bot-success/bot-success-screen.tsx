import { useTranslation } from "react-i18next";

import { EmptyCard } from "~app/components/empty-card";
import { Text } from "~components/text";

export const BotSuccessScreen = () => {
	const { t } = useTranslation("bot-success");
	return (
		<EmptyCard title={t("header")}>
			<Text variant="h3" className="text-center">
				{t("message")}
			</Text>
		</EmptyCard>
	);
};
