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
import { useReceiptTransfersIntentions } from "~app/hooks/use-receipt-transfer-intentions";
import { trpc } from "~app/trpc";
import {
	AccountIcon,
	AdminIcon,
	DebtsIcon,
	ReceiptsIcon,
	SettingsIcon,
	UsersIcon,
} from "~components/icons";

const useReceiptsNotificatons = () => useReceiptTransfersIntentions();

const useShowAdmin = () => {
	const accountQuery = trpc.account.get.useQuery();
	const role =
		accountQuery.status === "success" ? accountQuery.data.account.role : null;
	return role === "admin";
};

export const PROTECTED_ELEMENTS: MenuElement[] = [
	{
		Icon: ReceiptsIcon,
		href: "/receipts",
		text: "Receipts",
		useBadgeAmount: useReceiptsNotificatons,
	},
	{
		Icon: DebtsIcon,
		text: "Debts",
		href: "/debts",
		useBadgeAmount: useDebtsIntentions,
	},
	{
		Icon: UsersIcon,
		text: "Users",
		href: "/users",
		useBadgeAmount: useConnectionIntentions,
	},
	{ Icon: AccountIcon, text: "Account", href: "/account" },
	{ Icon: SettingsIcon, text: "Settings", href: "/settings" },
	{
		Icon: AdminIcon,
		href: "/admin",
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
