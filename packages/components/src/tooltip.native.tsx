import type React from "react";

import { Popover } from "heroui-native";

import { Icon } from "~components/icons";
import { Text } from "~components/text";
import { cn } from "~components/utils";
import { View } from "~components/view";

import type { Props } from "./tooltip";

export const Tooltip: React.FC<Props> = ({
	children,
	content,
	className,
	isDisabled,
	infoClassName,
}) => (
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
			<Popover.Overlay />
			<Popover.Content className={cn("px-2.5 py-1", className)}>
				{typeof content === "string" ? <Text>{content}</Text> : content}
			</Popover.Content>
		</Popover.Portal>
	</Popover>
);
