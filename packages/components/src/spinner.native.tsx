import type React from "react";

import { Spinner as SpinnerRaw } from "heroui-native/spinner";

import type { Props } from "./spinner";

export const Spinner: React.FC<Props> = ({ size }) => (
	<SpinnerRaw size={size === "xs" ? "sm" : size} />
);
