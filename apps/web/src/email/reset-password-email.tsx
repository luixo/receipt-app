import React from "react";

import { Text } from "@react-email/components";
import { useTranslation } from "react-i18next";

import { Button } from "./components";
import { EmailLayout } from "./email";

type Props = {
	token: string;
};

export const ResetPasswordEmail: React.FC<Props> = ({ token }) => {
	const { t } = useTranslation("email");
	return (
		<EmailLayout
			title={t("resetPassword.title")}
			subtitle={t("resetPassword.forgot")}
			footerNote={<Text>{t("resetPassword.expiration")}</Text>}
		>
			<Text>{t("resetPassword.requestReceived")}</Text>
			<Button
				navigate={{ to: "/reset-password", search: { token } }}
				className="mb-4"
			>
				{t("resetPassword.reset")}
			</Button>
			<Text>{t("resetPassword.notRequested")}</Text>
		</EmailLayout>
	);
};
