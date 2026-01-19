import React from "react";
import {
	type LayoutRectangle,
	View as RawView,
	type ViewStyle,
} from "react-native";

import { cn } from "~components/utils";

export type ViewReactNode =
	| React.JSX.Element
	| (ViewReactNode | undefined)[]
	| null;

export type Props = {
	className?: string;
	children?: ViewReactNode;
	testID?: string;
	onPress?: () => void;
	onLayout?: (rect: LayoutRectangle) => void;
	style?: ViewStyle;
};

export const View = React.memo<Props>(
	({ onPress, className, onLayout, ...props }) => (
		<RawView
			{...props}
			onClick={onPress}
			onLayout={onLayout ? (e) => onLayout(e.nativeEvent.layout) : undefined}
			className={cn(onPress ? "cursor-pointer" : undefined, className)}
		/>
	),
);
