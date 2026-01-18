import React from "react";
import { View as RawView } from "react-native";

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
};

export const View = React.memo<Props>(({ onPress, className, ...props }) => (
	<RawView
		{...props}
		onClick={onPress}
		className={cn(onPress ? "cursor-pointer" : undefined, className)}
	/>
));
