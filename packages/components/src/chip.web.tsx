import type React from "react";

import { Chip as ChipRaw } from "@heroui/react";

export type Props = {
	color?: Exclude<React.ComponentProps<typeof ChipRaw>["color"], "secondary">;
	className?: string;
	onPress?: () => void;
	children: string;
};

export const Chip: React.FC<Props> = ({ onPress, ...props }) => (
	<ChipRaw onClick={onPress} {...props} />
);
