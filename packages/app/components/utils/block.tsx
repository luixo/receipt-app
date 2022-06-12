import React from "react";
import * as ReactNative from "react-native";
import { styled, Text } from "../../utils/styles";

const Wrapper = styled(ReactNative.View)({
	padding: "$m",
	borderWidth: "$hairline",
	borderColor: "$muted",
	borderRadius: "$medium",
});

const Name = styled(Text)({
	marginBottom: "$s",
	fontSize: "$large",
});

type Props = {
	name?: string;
	onPress?: () => void;
	disabled?: boolean;
	children: React.ReactNode;
};

export const Block: React.FC<Props> = ({
	name,
	children,
	disabled,
	onPress,
}) => {
	const content = (
		<Wrapper>
			{name ? <Name>{name}</Name> : null}
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
