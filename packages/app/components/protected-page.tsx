import React from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import {
	AdminWrapper,
	AdminWrapperWithEffect,
} from "~app/components/app/admin-wrapper";
import { NoAuthEffect } from "~app/components/app/no-auth-effect";
import { Page } from "~app/components/page";
import { useConnectionIntentions } from "~app/hooks/use-connection-intentions";
import { useDebtsIntentions } from "~app/hooks/use-debts-intentions";
import { useTRPC } from "~app/utils/trpc";
import {
	AccountIcon,
	AdminIcon,
	DebtsIcon,
	ReceiptsIcon,
	SettingsIcon,
	UsersIcon,
} from "~components/icons";

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
						Icon: ReceiptsIcon,
						pathname: "/receipts",
						text: t("navigation.receipts"),
					},
					{
						Icon: DebtsIcon,
						text: t("navigation.debts"),
						pathname: "/debts",
						useBadgeAmount: useDebtsIntentions,
					},
					{
						Icon: UsersIcon,
						text: t("navigation.users"),
						pathname: "/users",
						useBadgeAmount: useConnectionIntentions,
					},
					{
						Icon: AccountIcon,
						text: t("navigation.account"),
						pathname: "/account",
					},
					{
						Icon: SettingsIcon,
						text: t("navigation.settings"),
						pathname: "/settings",
					},
					{
						Icon: AdminIcon,
						pathname: "/admin",
						text: t("navigation.admin"),
						useShow: useShowAdmin,
						PageWrapper: AdminWrapperWithEffect,
						ItemWrapper: AdminWrapper,
					},
				],
				[t],
			)}
			{...props}
		>
			{children}
			<NoAuthEffect />
		</Page>
	);
};
