import React from "react";
import { View } from "react-native";

type Props = {
	children: React.ReactNode;
	overlay?: React.ReactNode;
};

export const Overlay: React.FC<Props> = ({ children, overlay }) => (
	<View>
		{children}
		{overlay ? (
			<View className="bg-content4 rounded-medium absolute inset-[-10px] z-10 items-center justify-center opacity-30">
				{overlay}
			</View>
		) : null}
	</View>
);
