import type React from "react";

import { ScrollView } from "~components/scroll-view";
import type { ViewReactNode } from "~components/view";
import { View } from "~components/view";

export const PageWrapper: React.FC<{
	wrapper?: React.FC<React.PropsWithChildren>;
	children?: ViewReactNode;
}> = ({ wrapper: Wrapper, children }) => {
	const slot = (
		<View className="w-full max-w-screen-md gap-4 web:mx-auto">{children}</View>
	);
	return (
		<ScrollView className="h-full p-2 md:p-4">
			{Wrapper ? <Wrapper>{slot}</Wrapper> : slot}
			{/* Placeholder for page content not to get under the menu */}
			<View className="h-[72px]" />
		</ScrollView>
	);
};
