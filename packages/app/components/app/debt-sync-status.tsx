import type React from "react";
import { View } from "react-native";

import type { TRPCQueryOutput } from "~app/trpc";
import { Tooltip, tv } from "~components";
import {
	IncomingIcon,
	OutcomingIcon,
	SyncIcon,
	UnsyncIcon,
} from "~components/icons";

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

type TheirDebtPick = Pick<NonNullable<Debt["their"]>, "lockedTimestamp">;

const getContent = (
	lockedTimestamp: Debt["lockedTimestamp"],
	their?: TheirDebtPick,
) => {
	if (!lockedTimestamp) {
		return "Local debt, no sync";
	}
	if (!their) {
		return "Out of sync, we intent to push";
	}
	if (!their.lockedTimestamp) {
		return "Out of sync, we intent to sync, but they're not";
	}
	if (their.lockedTimestamp.valueOf() !== lockedTimestamp.valueOf()) {
		return `Out of sync, ${
			lockedTimestamp >= their.lockedTimestamp ? "we" : "they"
		} intent to sync`;
	}
	return "In sync with them";
};

type Props = {
	debt: Pick<Debt, "lockedTimestamp"> & { their?: TheirDebtPick };
	size?: "md" | "lg";
};

export const DebtSyncStatus: React.FC<Props> = ({
	size = "md",
	debt: { lockedTimestamp, their },
}) => {
	if (!lockedTimestamp) {
		return null;
	}
	const pixelSize = size === "md" ? 24 : 36;

	const isSynced =
		their?.lockedTimestamp?.valueOf() === lockedTimestamp.valueOf();
	return (
		<Tooltip
			content={getContent(lockedTimestamp, their)}
			placement="bottom-end"
		>
			<View
				className={wrapper({ type: isSynced ? "sync" : "unsync" })}
				testID="debt-sync-status"
			>
				{isSynced ? (
					<SyncIcon size={pixelSize} />
				) : (
					<UnsyncIcon size={pixelSize} />
				)}
				<View
					className={`absolute ${
						size === "md" ? "left-[13px]" : "left-[20px]"
					} top-0`}
				>
					{isSynced ? null : (their?.lockedTimestamp ?? 0) >=
					  lockedTimestamp ? (
						<IncomingIcon size={pixelSize} />
					) : (
						<OutcomingIcon size={pixelSize} />
					)}
				</View>
			</View>
		</Tooltip>
	);
};
