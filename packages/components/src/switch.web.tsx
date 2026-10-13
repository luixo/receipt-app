import type React from "react";

import { Switch as SwitchRaw } from "@heroui/react";

export type Props = React.PropsWithChildren<{
	isSelected?: boolean;
	onValueChange?: (value: boolean) => void;
	isDisabled?: boolean;
	isReadOnly?: boolean;
	size?: "sm" | "md" | "lg";
	className?: string;
	"aria-label"?: string;
	thumbIcon?: React.ReactNode;
	thumbClassName?: string;
	testID?: string;
}>;

export const Switch: React.FC<Props> = ({
	thumbClassName,
	thumbIcon,
	onValueChange,
	testID,
	children,
	...props
}) => (
	<SwitchRaw {...props} onChange={onValueChange} data-testid={testID}>
		<SwitchRaw.Content>
			<SwitchRaw.Control>
				<SwitchRaw.Thumb className={thumbClassName}>
					{thumbIcon ? <SwitchRaw.Icon>{thumbIcon}</SwitchRaw.Icon> : null}
				</SwitchRaw.Thumb>
			</SwitchRaw.Control>
			{children}
		</SwitchRaw.Content>
	</SwitchRaw>
);
