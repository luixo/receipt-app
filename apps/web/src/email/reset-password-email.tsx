import React from "react";

import { useTranslation } from "react-i18next";

import { Email } from "./email";

type Props = {
	token: string;
};

export const ResetPasswordEmail: React.FC<Props> = ({ token }) => {
	const { t } = useTranslation("email");
	return (
		<Email
			title={t("resetPassword.title")}
			footerChildren={[{ type: "text", text: t("resetPassword.expiration") }]}
		>
			{[
				{ type: "text", text: t("resetPassword.forgot"), size: "h3" },
				{
					type: "text",
					text: t("resetPassword.requestReceived"),
				},
				{
					type: "action",
					text: t("resetPassword.reset"),
					href: `reset-password?token=${token}`,
				},
				{
					type: "text",
					text: t("resetPassword.notRequested"),
				},
			]}
		</Email>
	);
};
