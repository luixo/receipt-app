import React from "react";

import { Tooltip, styled } from "@nextui-org/react";
import {
	MdOutlineLock as LockIcon,
	MdOutlineLockOpen as UnlockedIcon,
} from "react-icons/md";

const Wrapper = styled(LockIcon, {
	size: 24,

	variants: {
		disabled: {
			true: {
				color: "$accents1",
			},
		},
	},
});

type Props = {
	locked: boolean;
	tooltip: string;
};

export const LockedIcon: React.FC<Props> = ({ locked, tooltip }) => (
	<Tooltip content={tooltip} css={{ whiteSpace: "pre" }} placement="bottomEnd">
		<Wrapper as={locked ? LockIcon : UnlockedIcon} />
	</Tooltip>
);
