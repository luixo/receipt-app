import type React from "react";

import { useTranslation } from "react-i18next";

import { EmptyCard } from "~app/components/empty-card";
import { PageHeader } from "~app/components/page-header";
import { Text } from "~components/text";

import { VoidAccount } from "./void-account";

export const VoidAccountScreen: React.FC<{
	token?: string;
}> = ({ token }) => {
	const { t } = useTranslation("void-account");
	return (
		<>
			<PageHeader>{t("header")}</PageHeader>
			{token ? (
				<VoidAccount token={token} />
			) : (
				<EmptyCard title={t("noToken.title")}>
					<Text variant="h3">{t("noToken.message")}</Text>
				</EmptyCard>
			)}
		</>
	);
};
