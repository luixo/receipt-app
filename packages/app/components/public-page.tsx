import React from "react";

import { useTranslation } from "react-i18next";

import { Page } from "~app/components/page";
import { LoginIcon, RegisterIcon } from "~components/icons";

type Props = {
	children: React.ReactNode;
} & Omit<React.ComponentProps<typeof Page>, "elements">;

export const PublicPage: React.FC<Props> = ({ children, ...props }) => {
	const { t } = useTranslation("default");
	return (
		<Page
			elements={React.useMemo(
				() => [
					{
						pathname: "/login",
						Icon: LoginIcon,
						text: t("navigation.login"),
					},
					{
						pathname: "/register",
						Icon: RegisterIcon,
						text: t("navigation.register"),
					},
				],
				[t],
			)}
			{...props}
		>
			{children}
		</Page>
	);
};
