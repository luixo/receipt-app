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
> & {
	thumbIcon?: React.ReactNode;
	thumbClassName?: string;
};

export const Switch: React.FC<Props> = ({ thumbClassName, ...props }) => (
	<SwitchRaw {...props} classNames={{ thumb: thumbClassName }} />
);
