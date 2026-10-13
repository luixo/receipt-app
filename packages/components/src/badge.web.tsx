import type React from "react";

import { Badge as BadgeRaw } from "@heroui/react";

import type { MaybeText } from "~components/text.web";
import type { ViewReactNode } from "~components/view.web";

export type Props = {
	color: "accent" | "default" | "success" | "warning" | "danger";
	content?: MaybeText;
	children: ViewReactNode;
	isInvisible?: boolean;
	className?: string;
	testID?: string;
};

export const Badge: React.FC<Props> = ({
	content,
	isInvisible,
	children,
	testID = "badge",
	...props
}) => (
	<BadgeRaw.Anchor>
		{children}
		<BadgeRaw
			size="sm"
			className={isInvisible ? "hidden" : undefined}
			data-testid={testID}
			{...props}
		>
			<BadgeRaw.Label>{content}</BadgeRaw.Label>
		</BadgeRaw>
	</BadgeRaw.Anchor>
);
