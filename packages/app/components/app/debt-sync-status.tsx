import React from "react";

import { styled } from "@nextui-org/react";
import { Tooltip } from "@nextui-org/react-tailwind";
import {
	MdKeyboardArrowLeft as IncomingIcon,
	MdKeyboardArrowRight as OutcomingIcon,
	MdSync as SyncIcon,
	MdSyncProblem as UnsyncIcon,
} from "react-icons/md";

import type { TRPCQueryOutput } from "app/trpc";

const Wrapper = styled("div", {
	display: "flex",
	whiteSpace: "nowrap",

	variants: {
		type: {
			sync: {
				color: "$success",
			},
			unsync: {
				color: "$warning",
			},
		},
	},
});

const StyledSyncIcon = styled(SyncIcon);

const DirectionIcon = styled(OutcomingIcon);

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
	size: number;
};

export const DebtSyncStatus: React.FC<Props> = ({
	size,
	debt: { lockedTimestamp, their },
}) => {
	if (!lockedTimestamp) {
		return null;
	}

	const isSynced =
		lockedTimestamp &&
		their?.lockedTimestamp?.valueOf() === lockedTimestamp.valueOf();
	return (
		<Tooltip
			content={getContent(lockedTimestamp, their)}
			placement="bottom-end"
		>
			<Wrapper type={isSynced ? "sync" : "unsync"}>
				<StyledSyncIcon as={isSynced ? SyncIcon : UnsyncIcon} css={{ size }} />
				{isSynced || !lockedTimestamp ? null : (
					<DirectionIcon
						as={
							(their?.lockedTimestamp ?? 0) >= lockedTimestamp
								? IncomingIcon
								: OutcomingIcon
						}
						css={{ size, margin: `0 ${-(size / 4)}px` }}
					/>
				)}
			</Wrapper>
		</Tooltip>
	);
};
