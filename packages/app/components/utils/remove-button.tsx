import React from "react";
import * as ReactNative from "react-native";
import { styled } from "../../utils/styles";

type Props = {
	children: string;
	onPress?: (event: ReactNative.GestureResponderEvent) => void;
};

const Button = styled(ReactNative.Button)({
	padding: "$m",
	borderWidth: "$hairline",
	borderColor: "$highlight",
});

export const RemoveButton: React.FC<Props> = ({ onPress, children }) => {
	return <Button title={children} onPress={onPress} />;
};
