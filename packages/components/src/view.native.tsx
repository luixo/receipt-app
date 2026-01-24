import type React from "react";
import { Pressable, View as RawView } from "react-native";

import { TextWrapper } from "~components/text.native";
import { cn } from "~components/utils";

import type { Props } from "./view";

export const View: React.FC<Props> = ({
	onPress,
	className,
	onLayout,
	...props
}) => {
	const Component = onPress ? Pressable : RawView;
	return (
		<TextWrapper className={className}>
			<Component
				className={cn(
					onPress ? "active:opacity-hover active:scale-95" : undefined,
					className,
				)}
				onPress={onPress}
				onLayout={onLayout ? (e) => onLayout(e.nativeEvent.layout) : undefined}
				{...props}
			/>
		</TextWrapper>
	);
};
