import type React from "react";
import { Pressable } from "react-native";

import { Chip as ChipRaw } from "heroui-native";

import type { Props } from "./chip";

export const Chip: React.FC<Props> = ({ color, onPress, ...props }) => (
	<Pressable onPress={onPress}>
		<ChipRaw color={color === "primary" ? "accent" : color} {...props} />
	</Pressable>
);
