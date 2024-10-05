import type React from "react";
import { View } from "react-native";

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
	synced: boolean,
	debt: DebtPartial,
	theirDebt?: DebtPartial,
) => {
	if (!theirDebt) {
		return "Out of sync, we intent to push";
	}
	if (synced) {
		return "In sync with them";
	}
	return `Out of sync, ${
		debt.updatedAt.valueOf() >= theirDebt.updatedAt.valueOf() ? "we" : "they"
	} intent to sync`;
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
	const pixelSize = size === "md" ? 24 : 36;

	const synced = theirDebt ? areDebtsSynced(debt, theirDebt) : false;
	return (
		<Tooltip
			content={getContent(synced, debt, theirDebt)}
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
					{synced ? null : (theirDebt?.updatedAt.valueOf() ?? 0) >=
					  debt.updatedAt.valueOf() ? (
						<IncomingIcon size={pixelSize} />
					) : (
						<OutcomingIcon size={pixelSize} />
					)}
				</View>
			</View>
		</Tooltip>
	);
};
