import type React from "react";
import { Text, View } from "react-native";

export const getFormData = async () => {
	const formData = new FormData();
	return formData;
};

export const AvatarCropper: React.FC<React.PropsWithChildren> = ({
	children,
}) => (
	<View>
		<Text>Cropper</Text>
		{children}
	</View>
);
