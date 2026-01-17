import type React from "react";
import { Text, View } from "react-native";

export const Avatar: React.FC<React.PropsWithChildren> = ({ children }) => (
	<View>
		<Text>Avatar</Text>
		{children}
	</View>
);

export const AvatarGroup: React.FC<React.PropsWithChildren> = ({
	children,
}) => (
	<View>
		<Text>AvatarGroup</Text>
		{children}
	</View>
);

export const useAvatarGroupContext = () => null;
