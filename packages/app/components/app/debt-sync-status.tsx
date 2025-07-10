import type React from "react";
import { View } from "react-native";

import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import type { TRPCQueryOutput } from "~app/trpc";
import { areDebtsSynced } from "~app/utils/debts";
import {
	IncomingIcon,
	OutcomingIcon,
	SyncIcon,
	UnsyncIcon,
} from "~components/icons";
import { Tooltip } from "~components/tooltip";
import { tv } from "~components/utils";
import { isFirstEarlier } from "~utils/date";

const wrapper = tv({
	base: "flex-row",
	variants: {
		type: {
			sync: "text-success",
			unsync: "text-warning",
		},
	},
});

type Debt = TRPCQueryOutput<"debts.get">;

const getContent = (
	t: TFunction,
	synced: boolean,
	debt: DebtPartial,
	theirDebt: DebtPartial | undefined,
) => {
	if (!theirDebt) {
		return t("components.debtSyncStatus.outOfSyncPush");
	}
	if (synced) {
		return t("components.debtSyncStatus.inSync");
	}
	return isFirstEarlier(theirDebt.updatedAt, debt.updatedAt)
		? t("components.debtSyncStatus.outOfSyncWe")
		: t("components.debtSyncStatus.outOfSyncThey");
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
	const pixelSize = size === "md" ? 24 : 36;

	const synced = theirDebt ? areDebtsSynced(debt, theirDebt) : false;
	return (
		<Tooltip
			content={getContent(t, synced, debt, theirDebt)}
			placement="bottom-end"
		>
			<View
				className={wrapper({ type: synced ? "sync" : "unsync" })}
				testID="debt-sync-status"
			>
				{synced ? (
					<SyncIcon size={pixelSize} />
				) : (
					<UnsyncIcon size={pixelSize} />
				)}
				<View
					className={`absolute ${
						size === "md" ? "left-[13px]" : "left-[20px]"
					} top-0`}
				>
					{synced ? null : theirDebt?.updatedAt &&
					  isFirstEarlier(debt.updatedAt, theirDebt.updatedAt) ? (
						<IncomingIcon size={pixelSize} />
					) : (
						<OutcomingIcon size={pixelSize} />
					)}
				</View>
			</View>
		</Tooltip>
	);
};
