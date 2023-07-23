import React from "react";

import { styled, Tooltip } from "@nextui-org/react";
import {
	MdSync as SyncIcon,
	MdSyncProblem as UnsyncIcon,
	MdKeyboardArrowLeft as IncomingIcon,
	MdKeyboardArrowRight as OutcomingIcon,
} from "react-icons/md";

import { TRPCQueryOutput } from "app/trpc";

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

const getContent = (
	status: Debt["status"],
	intentionDirection: Debt["intentionDirection"],
) => {
	switch (status) {
		case "nosync":
			return "Local debt, no sync";
		case "sync":
			return "In sync with a user";
		case "unsync": {
			switch (intentionDirection) {
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
	status: Debt["status"];
	intentionDirection: Debt["intentionDirection"];
	size: number;
};

export const DebtSyncStatus: React.FC<Props> = ({
	size,
	status,
	intentionDirection,
}) => {
	if (status === "nosync") {
		return null;
	}

	return (
		<Tooltip
			content={getContent(status, intentionDirection)}
			css={{ whiteSpace: "pre" }}
			placement="bottomEnd"
		>
			<Wrapper type={status}>
				<StyledSyncIcon
					as={status === "sync" ? SyncIcon : UnsyncIcon}
					css={{ size }}
				/>
				{status === "sync" || !intentionDirection ? null : (
					<DirectionIcon
						as={intentionDirection === "self" ? OutcomingIcon : IncomingIcon}
						css={{ size, margin: `0 ${-(size / 4)}px` }}
					/>
				)}
			</Wrapper>
		</Tooltip>
	);
};
