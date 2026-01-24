import type React from "react";

import { Divider as DividerRaw } from "@heroui/react";

export type Props = {
	className?: string;
};

export const Divider: React.FC<Props> = DividerRaw;
