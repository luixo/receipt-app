import type React from "react";

import {
	AdminWrapper,
	AdminWrapperWithEffect,
} from "~app/components/app/admin-wrapper";
import { NoAuthEffect } from "~app/components/app/no-auth-effect";
import type { MenuElement } from "~app/components/page";
import { Page } from "~app/components/page";
import { useConnectionIntentions } from "~app/hooks/use-connection-intentions";
import { useDebtsIntentions } from "~app/hooks/use-debts-intentions";
import type { UrlParams } from "~app/hooks/use-navigation";
import { trpc } from "~app/trpc";
import {
	AccountIcon,
	AdminIcon,
	DebtsIcon,
	ReceiptsIcon,
	SettingsIcon,
	UsersIcon,
} from "~components/icons";

const useShowAdmin = () => {
	const accountQuery = trpc.account.get.useQuery();
	const role =
		accountQuery.status === "success" ? accountQuery.data.account.role : null;
	return role === "admin";
};

export const PROTECTED_ELEMENTS: MenuElement[] = [
	{
		Icon: ReceiptsIcon,
		urlParams: { to: "/receipts" } satisfies UrlParams<"/receipts">,
		text: "Receipts",
	},
	{
		Icon: DebtsIcon,
		text: "Debts",
		urlParams: { to: "/debts" } satisfies UrlParams<"/debts">,
		useBadgeAmount: useDebtsIntentions,
	},
	{
		Icon: UsersIcon,
		text: "Users",
		urlParams: { to: "/users" } satisfies UrlParams<"/users">,
		useBadgeAmount: useConnectionIntentions,
	},
	{
		Icon: AccountIcon,
		text: "Account",
		urlParams: { to: "/account" } satisfies UrlParams<"/account">,
	},
	{
		Icon: SettingsIcon,
		text: "Settings",
		urlParams: { to: "/settings" } satisfies UrlParams<"/settings">,
	},
	{
		Icon: AdminIcon,
		urlParams: { to: "/admin" } satisfies UrlParams<"/admin">,
		text: "Admin",
		useShow: useShowAdmin,
		PageWrapper: AdminWrapperWithEffect,
		ItemWrapper: AdminWrapper,
	},
];

type Props = {
	children: React.ReactNode;
};

export const ProtectedPage: React.FC<Props> = ({ children }) => (
	<Page elements={PROTECTED_ELEMENTS}>
		{children}
		<NoAuthEffect />
	</Page>
);
