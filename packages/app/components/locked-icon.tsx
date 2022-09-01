import React from "react";

import { Tooltip, styled } from "@nextui-org/react";
import {
	MdOutlineLock as LockIcon,
	MdOutlineLockOpen as UnlockedIcon,
} from "react-icons/md";

const Wrapper = styled(LockIcon, {
	size: 24,

	variants: {
		locked: {
			true: {
				color: "$success",
			},
			false: {
				color: "$warning",
			},
		},
	},
});

type Props = {
	locked: boolean;
	tooltip?: string;
} & React.ComponentProps<typeof Wrapper>;

export const LockedIcon: React.FC<Props> = ({ locked, tooltip, ...props }) => {
	const content = (
		<Wrapper locked={locked} as={locked ? LockIcon : UnlockedIcon} {...props} />
	);
	if (tooltip) {
		return (
			<Tooltip
				content={tooltip}
				css={{ whiteSpace: "pre" }}
				placement="bottomEnd"
			>
				{content}
			</Tooltip>
		);
	}
	return content;
};
