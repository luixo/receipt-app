import React from "react";
import { Pressable, View as RawView } from "react-native";

import { TextWrapper } from "~components/text.native";
import { cn } from "~components/utils";

import type { Props } from "./view";

export const View = React.memo<Props>(({ onPress, className, ...props }) => {
	const Component = onPress ? Pressable : RawView;
	return (
		<TextWrapper className={className}>
			<Component
				className={cn("active:opacity-hover active:scale-95", className)}
				onPress={onPress}
				{...props}
			/>
		</TextWrapper>
	);
});
