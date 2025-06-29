import type React from "react";

import { useTranslation } from "react-i18next";

import { EmptyCard } from "~app/components/empty-card";
import { PageHeader } from "~app/components/page-header";

import { ResetPassword } from "./reset-password";

export const ResetPasswordScreen: React.FC<{
	token?: string;
}> = ({ token }) => {
	const { t } = useTranslation("reset-password");
	return (
		<>
			<PageHeader>{t("header")}</PageHeader>
			{token ? (
				<ResetPassword token={token} />
			) : (
				<EmptyCard title={t("noToken.title")}>{t("noToken.message")}</EmptyCard>
			)}
		</>
	);
};
