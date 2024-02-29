import React from "react";

import { NoAuthEffect } from "~app/components/app/no-auth-effect";
import type { MenuElement } from "~app/components/page";
import { Page } from "~app/components/page";
import { useConnectionIntentions } from "~app/hooks/use-connection-intentions";
import { useDebtsIntentions } from "~app/hooks/use-debts-intentions";
import { useNonResolvedReceipts } from "~app/hooks/use-non-resolved-receipts";
import { useReceiptTransfersIntentions } from "~app/hooks/use-receipt-transfer-intentions";
import {
	AccountIcon,
	DebtsIcon,
	ReceiptsIcon,
	SettingsIcon,
	UsersIcon,
} from "~components/icons";

const useReceiptsNotificatons = () => {
	const nonResolvedReceipts = useNonResolvedReceipts();
	const receiptTransfersIntentions = useReceiptTransfersIntentions();
	return nonResolvedReceipts + receiptTransfersIntentions;
};

const PROTECTED_ELEMENTS: MenuElement[] = [
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
