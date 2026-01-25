import type React from "react";

import { Avatar } from "~components/avatar";
import { Text } from "~components/text";
import type { Props } from "~components/user";
import { cn } from "~components/utils";
import { View } from "~components/view";

export const User: React.FC<Props> = ({
	avatarProps,
	name,
	description,
	testID,
	className,
	onPress,
}) => (
	<View
		className={cn("flex flex-row items-center justify-center gap-2", className)}
		onPress={onPress}
		testID={testID}
	>
		<Avatar {...avatarProps} />
		<View>
			{typeof name === "string" ? <Text>{name}</Text> : name}
			{typeof description === "string" ? (
				<Text className="text-small text-foreground-400">{description}</Text>
			) : (
				description
			)}
		</View>
	</View>
);
