import React from "react";

import { Popover } from "heroui-native/popover";

import { Icon } from "#components/icons.tsx";
import { TextClassContext } from "#components/text.native.tsx";
import { Text } from "#components/text.tsx";
import { cn } from "#components/utils.ts";
import { View } from "#components/view.tsx";

import type { Props } from "./tooltip";

export const Tooltip: React.FC<Props> = ({
	children,
	content,
	className,
	isDisabled,
	infoClassName,
	skipMobile,
}) => {
	const textContext = React.use(TextClassContext);
	if (skipMobile) {
		return children;
	}
	return (
		<Popover isDisabled={isDisabled}>
			<Popover.Trigger asChild isDisabled={isDisabled}>
				<View className="flex-row items-center gap-1">
					{children}
					{isDisabled ? null : (
						<Icon name="info" className={cn("size-4", infoClassName)} />
					)}
				</View>
			</Popover.Trigger>
			<Popover.Portal>
				<TextClassContext value={textContext}>
					<Popover.Overlay />
					<Popover.Content
						presentation="popover"
						className={cn("px-2.5 py-1", className)}
					>
						{typeof content === "string" ? <Text>{content}</Text> : content}
					</Popover.Content>
				</TextClassContext>
			</Popover.Portal>
		</Popover>
	);
};
