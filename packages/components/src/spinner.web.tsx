import type React from "react";

import { Spinner as SpinnerRaw } from "@heroui/spinner";

export type Props = {
	size?: React.ComponentProps<typeof SpinnerRaw>["size"] | "xs";
};

export const Spinner: React.FC<Props> = ({ size }) => (
	<SpinnerRaw
		size={size === "xs" ? "sm" : size}
		classNames={size === "xs" ? { wrapper: "size-3" } : undefined}
	/>
);
