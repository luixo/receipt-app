import type React from "react";

import { Avatar } from "#components/avatar.tsx";
import { Text } from "#components/text.tsx";
import type { Props } from "#components/user.tsx";
import { cn } from "#components/utils.ts";
import { View } from "#components/view.tsx";

export const User: React.FC<Props> = ({
	avatarProps,
	name,
	description,
	testID,
	className,
	onPress,
}) => (
	<View
		className={cn("flex flex-row items-center gap-2", className)}
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
