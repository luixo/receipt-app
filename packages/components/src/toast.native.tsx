import type React from "react";
import { Text, View } from "react-native";

export const addToast = () => {};

export const closeAll = () => {};

export const ToastProvider: React.FC<React.PropsWithChildren> = ({
	children,
}) => (
	<View>
		<Text>ToastProvider</Text>
		{children}
	</View>
);

export const getToastQueue = () => {};

export const defaultToastProps = {};
