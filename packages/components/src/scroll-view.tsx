import React from "react";
import {
	Platform,
	ScrollView as ScrollViewRaw,
	findNodeHandle,
} from "react-native";

export const ScrollContext = React.createContext<{
	getHandle: () => number | null;
	getRef: () => ScrollViewRaw | null;
}>({ getHandle: () => 0, getRef: () => null });

export type Props = {
	className?: string;
	children?: React.ReactNode;
};

export const ScrollView: React.FC<Props> = ({ children, ...props }) => {
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
	return (
		<ScrollViewRaw ref={scrollRef} {...props}>
			<ScrollContext value={context}>{children}</ScrollContext>
		</ScrollViewRaw>
	);
};
