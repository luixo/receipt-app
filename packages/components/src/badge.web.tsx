import type React from "react";

import { Badge as BadgeRaw } from "@heroui/badge";

import type { MaybeText } from "~components/text.web";
import type { ViewReactNode } from "~components/view.web";

export type Props = {
	color: "warning" | "danger";
	content?: MaybeText;
	children: ViewReactNode;
	isInvisible?: boolean;
	className?: string;
};

export const Badge: React.FC<Props> = ({ content = "", ...props }) => (
	<BadgeRaw
		placement="top-right"
		size="lg"
		content={content}
		isDot={!content}
		classNames={{ base: "self-start" }}
		{...props}
	/>
);
