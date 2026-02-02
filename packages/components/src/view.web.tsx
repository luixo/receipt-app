import type React from "react";
import {
	type LayoutRectangle,
	View as RawView,
	type ViewStyle,
} from "react-native";

import { cn } from "~components/utils";

import type { ViewHandle } from "./view.base";
import { useScrollView } from "./view.base";

export type ViewReactNode =
	| React.JSX.Element
	| (ViewReactNode | undefined)[]
	| null;

export type Props = Pick<React.ComponentProps<typeof RawView>, "role"> & {
	ref?: React.Ref<ViewHandle | null>;
	className?: string;
	children?: ViewReactNode;
	testID?: string;
	onPress?: () => void;
	onLayout?: (rect: LayoutRectangle) => void;
	style?: ViewStyle;
};

export const View: React.FC<Props> = ({
	onPress,
	className,
	onLayout,
	ref,
	...props
}) => {
	const innerRef = useScrollView(ref);
	return (
		<RawView
			ref={innerRef}
			{...props}
			onClick={onPress}
			onLayout={onLayout ? (e) => onLayout(e.nativeEvent.layout) : undefined}
			className={cn(onPress ? "cursor-pointer" : undefined, className)}
		/>
	);
};
