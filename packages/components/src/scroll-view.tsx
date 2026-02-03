import React from "react";
import {
	Platform,
	ScrollView as ScrollViewRaw,
	findNodeHandle,
} from "react-native";

export type ScrollHandle = {
	getHandle: () => number | null;
	getRef: () => ScrollViewRaw | null;
};
export const ScrollContext = React.createContext<ScrollHandle>({
	getHandle: () => 0,
	getRef: () => null,
});

export type Props = {
	children?: React.ReactNode;
	ref?: React.RefObject<ScrollHandle | null>;
} & Omit<React.ComponentProps<typeof ScrollViewRaw>, "children" | "ref">;

export const ScrollView: React.FC<Props> = ({ children, ref, ...props }) => {
	const scrollRef = React.useRef<ScrollViewRaw>(null);
	const context = React.useMemo<React.ContextType<typeof ScrollContext>>(() => {
		if (Platform.OS === "web") {
			return {
				getHandle: () => scrollRef.current as unknown as number,
				getRef: () => scrollRef.current,
			};
		}
		return {
			getHandle: () => findNodeHandle(scrollRef.current),
			getRef: () => scrollRef.current,
		};
	}, []);
	React.useImperativeHandle(ref, () => context, [context]);
	return (
		<ScrollViewRaw ref={scrollRef} {...props}>
			<ScrollContext value={context}>{children}</ScrollContext>
		</ScrollViewRaw>
	);
};
