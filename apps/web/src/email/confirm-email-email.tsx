import React from "react";

import { useTranslation } from "react-i18next";

import { Email } from "./email";

type Props = {
	token: string;
};

export const ConfirmEmailEmail: React.FC<Props> = ({ token }) => {
	const { t } = useTranslation("email");
	return (
		<Email title={t("confirmEmail.title")}>
			{[
				{ type: "text", text: t("confirmEmail.welcome"), size: "h3" },
				{
					type: "text",
					text: t("confirmEmail.greeting"),
				},
				{
					type: "action",
					text: t("confirmEmail.confirm"),
					href: `confirm-email?token=${token}`,
				},
				{
					type: "text",
					text: t("confirmEmail.notRegistered"),
				},
				{
					type: "action",
					text: t("confirmEmail.voidAccount"),
					href: `void-account?token=${token}`,
				},
			]}
		</Email>
	);
};
