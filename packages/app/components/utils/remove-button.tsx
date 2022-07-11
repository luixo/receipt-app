import React from "react";
import * as ReactNative from "react-native";

import { styled } from "../../utils/styles";

type Props = {
	children: string;
} & ReactNative.TouchableOpacityProps;

const Button = styled(ReactNative.Button)({
	padding: "$m",
	borderWidth: "$hairline",
	borderColor: "$highlight",
});

export const RemoveButton: React.FC<Props> = ({
	children,
	onPress,
	...props
}) => (
	<ReactNative.TouchableOpacity {...props}>
		<Button title={children} disabled={props.disabled} onPress={onPress} />
	</ReactNative.TouchableOpacity>
);
