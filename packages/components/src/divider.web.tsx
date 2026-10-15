import type React from "react";

import { Separator as DividerRaw } from "@heroui/react";

export type Props = {
	className?: string;
	testID?: string;
};

export const Divider: React.FC<Props> = ({ testID = "divider", ...props }) => (
	<DividerRaw data-testid={testID} {...props} />
);
