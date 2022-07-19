import React from "react";
import * as ReactNative from "react-native";

import { styled, Text } from "app/utils/styles";

const Wrapper = styled(ReactNative.View)({
	padding: "md",
	borderWidth: "light",
	borderColor: "border",
	borderRadius: "md",
});

const Name = styled(Text)({
	marginBottom: "sm",
	fontSize: "lg",
});

type Props = {
	name?: React.ReactNode;
	onPress?: () => void;
	onNamePress?: () => void;
	disabled?: boolean;
	children: React.ReactNode;
};

export const Block: React.FC<Props> = ({
	name,
	children,
	disabled,
	onPress,
	onNamePress,
}) => {
	const content = (
		<Wrapper>
			{name ? (
				<Name onPress={disabled ? undefined : onNamePress}>{name}</Name>
			) : null}
			{children}
		</Wrapper>
	);
	if (onPress) {
		return (
			<ReactNative.TouchableOpacity disabled={disabled} onPress={onPress}>
				{content}
			</ReactNative.TouchableOpacity>
		);
	}
	return content;
};
