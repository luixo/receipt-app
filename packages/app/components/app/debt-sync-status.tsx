import type React from "react";

import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import type { TRPCQueryOutput } from "~app/trpc";
import { areDebtsSynced } from "~app/utils/debts";
import { Icon } from "~components/icons";
import { Tooltip } from "~components/tooltip";
import { cn } from "~components/utils";
import { View } from "~components/view";
import { compare } from "~utils/date";

type Debt = TRPCQueryOutput<"debts.get">;

const getContent = (
	t: TFunction,
	synced: boolean,
	theirUpdateIsNewer: boolean,
	theirDebt: DebtPartial | undefined,
) => {
	if (!theirDebt) {
		return t("components.debtSyncStatus.outOfSyncPush");
	}
	if (synced) {
		return t("components.debtSyncStatus.inSync");
	}
	return theirUpdateIsNewer
		? t("components.debtSyncStatus.outOfSyncThey")
		: t("components.debtSyncStatus.outOfSyncWe");
};

type DebtPartial = Pick<
	Debt,
	"amount" | "currencyCode" | "timestamp" | "updatedAt"
>;

type Props = {
	debt: DebtPartial;
	theirDebt?: DebtPartial;
	size?: "md" | "lg";
};

export const DebtSyncStatus: React.FC<Props> = ({
	size = "md",
	debt,
	theirDebt,
}) => {
	const { t } = useTranslation("default");
	const iconClassName = size === "md" ? "size-6" : "size-9";

	const synced = theirDebt ? areDebtsSynced(debt, theirDebt) : false;
	const theirUpdateIsNewer = theirDebt
		? compare.zonedDateTime(theirDebt.updatedAt, debt.updatedAt) > 0
		: false;
	return (
		<Tooltip
			content={getContent(t, synced, theirUpdateIsNewer, theirDebt)}
			placement="bottom-end"
		>
			<View
				className={cn("flex-row", synced ? "text-success" : "text-warning")}
				testID="debt-sync-status"
			>
				{synced ? (
					<Icon name="sync" className={iconClassName} />
				) : (
					<Icon name="unsync" className={iconClassName} />
				)}
				<View
					className={`absolute ${
						size === "md" ? "left-[13px]" : "left-[20px]"
					} top-0`}
				>
					{synced ? null : theirUpdateIsNewer ? (
						<Icon name="incoming" className={iconClassName} />
					) : (
						<Icon name="outcoming" className={iconClassName} />
					)}
				</View>
			</View>
		</Tooltip>
	);
};
