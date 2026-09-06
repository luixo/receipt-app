import type React from "react";

import { Switch as SwitchRaw } from "@heroui/switch";

export type Props = Pick<
	React.ComponentProps<typeof SwitchRaw>,
	| "isSelected"
	| "onValueChange"
	| "isDisabled"
	| "isReadOnly"
	| "size"
	| "className"
	| "aria-label"
> & {
	thumbIcon?: React.ReactNode;
	thumbClassName?: string;
	testID?: string;
};

export const Switch: React.FC<Props> = ({
	thumbClassName,
	testID,
	...props
}) => (
	<SwitchRaw
		{...props}
		classNames={{ thumb: thumbClassName }}
		data-testid={testID}
	/>
);
