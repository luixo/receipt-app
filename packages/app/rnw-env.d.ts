// override react-native types with react-native-web types
import "react-native";

// external interface extension
/* eslint-disable @typescript-eslint/consistent-type-definitions */
declare module "react-native" {
	interface PressableStateCallbackType {
		hovered?: boolean;
		focused?: boolean;
	}
	interface ViewStyle {
		transitionProperty?: string;
		transitionDuration?: string;
	}
	interface TextProps {
		accessibilityComponentType?: never;
		accessibilityTraits?: never;
		href?: string;
		hrefAttrs?: {
			rel: "noreferrer";
			target?: "_blank";
		};
	}
	interface ViewProps {
		accessibilityRole?: string;
		href?: string;
		hrefAttrs?: {
			rel: "noreferrer";
			target?: "_blank";
		};
		onClick?: (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void;
	}
}
/* eslint-enable @typescript-eslint/consistent-type-definitions */
