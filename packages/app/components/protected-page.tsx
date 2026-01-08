import React from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { AdminWrapper } from "~app/components/app/admin-wrapper";
import { Page } from "~app/components/page";
import { useConnectionIntentions } from "~app/hooks/use-connection-intentions";
import { useDebtsIntentions } from "~app/hooks/use-debts-intentions";
import { useTRPC } from "~app/utils/trpc";

const useShowAdmin = () => {
	const trpc = useTRPC();
	const { data: account } = useSuspenseQuery(trpc.account.get.queryOptions());
	return account.account.role === "admin";
};

type Props = {
	children: React.ReactNode;
} & Omit<React.ComponentProps<typeof Page>, "elements">;

export const ProtectedPage: React.FC<Props> = ({ children, ...props }) => {
	const { t } = useTranslation("default");
	return (
		<Page
			elements={React.useMemo(
				() => [
					{
						iconName: "receipt",
						pathname: "/receipts",
						text: t("navigation.receipts"),
					},
					{
						iconName: "debts",
						text: t("navigation.debts"),
						pathname: "/debts",
						useBadgeAmount: useDebtsIntentions,
					},
					{
						iconName: "users",
						text: t("navigation.users"),
						pathname: "/users",
						useBadgeAmount: useConnectionIntentions,
					},
					{
						iconName: "user",
						text: t("navigation.account"),
						pathname: "/account",
					},
					{
						iconName: "settings",
						text: t("navigation.settings"),
						pathname: "/settings",
					},
					{
						iconName: "admin",
						pathname: "/admin",
						text: t("navigation.admin"),
						useShow: useShowAdmin,
						PageWrapper: AdminWrapper,
						ItemWrapper: AdminWrapper,
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
