import type React from "react";

import { Spinner as SpinnerRaw } from "@heroui/react";

export type Props = {
	size?: "xs" | "sm" | "md" | "lg";
};

export const Spinner: React.FC<Props> = ({ size }) => (
	<SpinnerRaw
		size={size === "xs" ? "sm" : size}
		className={size === "xs" ? "size-3" : undefined}
	/>
);
