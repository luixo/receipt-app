import React from "react";

import {
	MdOutlineLock as LockIcon,
	MdOutlineLockOpen as UnlockedIcon,
} from "react-icons/md";

type Props = {
	locked: boolean;
	tooltip?: string;
} & React.ComponentProps<typeof LockIcon>;

export const LockedIcon: React.FC<Props> = ({ locked, tooltip, ...props }) =>
	locked ? (
		<LockIcon size={24} {...props} />
	) : (
		<UnlockedIcon size={24} {...props} />
	);
