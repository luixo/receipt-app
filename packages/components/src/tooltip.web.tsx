import type React from "react";

import { Tooltip as TooltipRaw } from "@heroui/tooltip";

import type { ViewReactNode } from "~components/view.web";

export type Props = Pick<
	React.ComponentProps<typeof TooltipRaw>,
	"content" | "placement" | "isDisabled" | "className"
> & {
	children?: ViewReactNode;
	infoClassName?: string;
};
export const Tooltip: React.FC<Props> = (props) => <TooltipRaw {...props} />;
