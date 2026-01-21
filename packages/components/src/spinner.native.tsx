import type React from "react";

import { Spinner as SpinnerRaw } from "heroui-native";

import type { Props } from "./spinner";

export const Spinner: React.FC<Props> = ({ size }) => (
	<SpinnerRaw size={size === "xs" ? "sm" : size} />
);
