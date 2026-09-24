import React from "react";

import { Text } from "@react-email/components";
import { useTranslation } from "react-i18next";

import { Button } from "./components";
import { EmailLayout } from "./email";

type Props = {
	token: string;
};

export const ConfirmEmailEmail: React.FC<Props> = ({ token }) => {
	const { t } = useTranslation("email");
	return (
		<EmailLayout
			title={t("confirmEmail.title")}
			subtitle={t("confirmEmail.welcome")}
		>
			<Text>{t("confirmEmail.greeting")}</Text>
			<Button
				navigate={{ to: "/confirm-email", search: { token } }}
				className="mb-4"
			>
				{t("confirmEmail.confirm")}
			</Button>
			<Text>{t("confirmEmail.notRegistered")}</Text>
			<Button navigate={{ to: "/void-user", search: { token } }}>
				{t("confirmEmail.voidUser")}
			</Button>
		</EmailLayout>
	);
};
