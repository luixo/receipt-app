import React from "react";

import { LockedOutlineIcon, UnlockedOutlineIcon } from "~components/icons";

type Props = {
	locked: boolean;
	tooltip?: string;
} & React.ComponentProps<typeof LockedOutlineIcon>;

export const LockedIcon: React.FC<Props> = ({ locked, tooltip, ...props }) =>
	locked ? (
		<LockedOutlineIcon size={24} {...props} />
	) : (
		<UnlockedOutlineIcon size={24} {...props} />
	);
