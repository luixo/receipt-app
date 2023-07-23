import React from "react";

import { styled, Tooltip } from "@nextui-org/react";
import {
	MdSync as SyncIcon,
	MdSyncProblem as UnsyncIcon,
	MdKeyboardArrowLeft as IncomingIcon,
	MdKeyboardArrowRight as OutcomingIcon,
} from "react-icons/md";

import { TRPCQueryOutput } from "app/trpc";
import { SyncStatus } from "next-app/handlers/debts-sync-intentions/utils";

const Wrapper = styled("div", {
	display: "flex",
	whiteSpace: "nowrap",

	variants: {
		type: {
			nosync: {},
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

const getContent = (syncStatus: Debt["syncStatus"]) => {
	switch (syncStatus.type) {
		case "nosync":
			return "Local debt, no sync";
		case "sync":
			return "In sync with a user";
		case "unsync": {
			// eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
			switch (syncStatus.intention?.direction) {
				case "self":
					return "Out of sync,\nour intention to sync was sent";
				case "remote":
					return "Out of sync,\nwe recieved an intention to sync";
				case undefined:
					return "Out of sync,\nno intentions to sync from either party";
			}
		}
	}
};

type Props = {
	syncStatus: SyncStatus;
	size: number;
};

export const DebtSyncStatus: React.FC<Props> = ({ size, syncStatus }) => {
	if (syncStatus.type === "nosync") {
		return null;
	}

	return (
		<Tooltip
			content={getContent(syncStatus)}
			css={{ whiteSpace: "pre" }}
			placement="bottomEnd"
		>
			<Wrapper type={syncStatus.type}>
				<StyledSyncIcon
					as={syncStatus.type === "sync" ? SyncIcon : UnsyncIcon}
					css={{ size }}
				/>
				{syncStatus.type === "sync" || !syncStatus.intention ? null : (
					<DirectionIcon
						as={
							syncStatus.intention.direction === "self"
								? OutcomingIcon
								: IncomingIcon
						}
						css={{ size, margin: `0 ${-(size / 4)}px` }}
					/>
				)}
			</Wrapper>
		</Tooltip>
	);
};
