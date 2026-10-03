import type React from "react";

import { Tooltip as TooltipRaw } from "@heroui/react";

import type { ViewReactNode } from "~components/view.web";

export type Props = {
	content: React.ReactNode;
	placement?: "top" | "bottom" | "left" | "right" | "bottom-end" | "top-end";
	isDisabled?: boolean;
	className?: string;
	children?: ViewReactNode;
	infoClassName?: string;
	skipMobile?: boolean;
};
export const Tooltip: React.FC<Props> = ({
	content,
	placement,
	isDisabled,
	className,
	infoClassName,
	children,
}) =>
	isDisabled ? (
		children
	) : (
		<TooltipRaw>
			<TooltipRaw.Trigger>{children}</TooltipRaw.Trigger>
			<TooltipRaw.Content
				placement={
					placement?.replace("-", " ") as React.ComponentProps<
						typeof TooltipRaw.Content
					>["placement"]
				}
				className={className ?? infoClassName}
			>
				{content}
			</TooltipRaw.Content>
		</TooltipRaw>
	);
