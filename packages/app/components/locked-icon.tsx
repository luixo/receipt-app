import React from "react";

import { Tooltip } from "@nextui-org/react-tailwind";
import {
	MdOutlineLock as LockIcon,
	MdOutlineLockOpen as UnlockedIcon,
} from "react-icons/md";

type Props = {
	locked: boolean;
	tooltip?: string;
} & React.ComponentProps<typeof LockIcon>;

export const LockedIcon: React.FC<Props> = ({ locked, tooltip, ...props }) => {
	const content = locked ? (
		<LockIcon size={24} {...props} />
	) : (
		<UnlockedIcon size={24} {...props} />
	);
	if (tooltip) {
		return (
			<Tooltip content={tooltip} placement="bottom-end">
				{content}
			</Tooltip>
		);
	}
	return content;
};
