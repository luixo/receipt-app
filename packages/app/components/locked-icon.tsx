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
	tooltip?: string;
} & React.ComponentProps<typeof Wrapper>;

export const LockedIcon: React.FC<Props> = ({ locked, tooltip, ...props }) => {
	const content = <Wrapper as={locked ? LockIcon : UnlockedIcon} {...props} />;
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
