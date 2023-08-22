import React from "react";

import { styled, Tooltip } from "@nextui-org/react";
import {
	MdSync as SyncIcon,
	MdSyncProblem as UnsyncIcon,
	MdKeyboardArrowLeft as IncomingIcon,
	MdKeyboardArrowRight as OutcomingIcon,
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

const getContent = (
	lockedTimestamp: Debt["lockedTimestamp"],
	their: Debt["their"],
) => {
	if (!lockedTimestamp) {
		return "Local debt, no sync";
	}
	if (!their) {
		return "Out of sync,\nwe intent to push";
	}
	if (!their.lockedTimestamp) {
		return "Out of sync,\nwe intent to sync, but they're not";
	}
	if (their.lockedTimestamp.valueOf() !== lockedTimestamp.valueOf()) {
		return `Out of sync, ${
			lockedTimestamp >= their.lockedTimestamp ? "we" : "they"
		} intent to sync`;
	}
	return "In sync with them";
};

type Props = {
	debt: Pick<Debt, "lockedTimestamp" | "their">;
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
			css={{ whiteSpace: "pre" }}
			placement="bottomEnd"
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
