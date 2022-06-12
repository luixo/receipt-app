import React from "react";
import * as ReactNative from "react-native";
import { styled } from "../../utils/styles";

type Props = {
	children: string;
	onPress?: (event: ReactNative.GestureResponderEvent) => void;
	disabled?: boolean;
};

const Button = styled(ReactNative.Button)({
	padding: "$m",
	borderWidth: "$hairline",
	borderColor: "$muted",
});

export const AddButton: React.FC<Props> = ({ onPress, children, disabled }) => {
	return <Button title={children} onPress={onPress} disabled={disabled} />;
};
