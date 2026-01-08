import React from "react";

import { useTranslation } from "react-i18next";

import { Page } from "~app/components/page";

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
						iconName: "login",
						text: t("navigation.login"),
					},
					{
						pathname: "/register",
						iconName: "register",
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
