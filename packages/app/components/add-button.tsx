import React from "react";
import * as ReactNative from "react-native";

import { styled } from "app/utils/styles";

type Props = {
	children: string;
	onPress?: (event: ReactNative.GestureResponderEvent) => void;
	disabled?: boolean;
};

const Button = styled(ReactNative.Button)({
	padding: "md",
	borderWidth: "light",
	borderColor: "border",
});

export const AddButton: React.FC<Props> = ({ onPress, children, disabled }) => (
	<Button title={children} onPress={onPress} disabled={disabled} />
);
