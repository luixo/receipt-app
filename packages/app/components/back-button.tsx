import React from "react";
import * as ReactNative from "react-native";

import { useLink } from "solito/link";

import { styled } from "app/utils/styles";

type Props = {
	href: string;
};

const Button = styled(ReactNative.Button)({
	padding: "md",
	borderWidth: "light",
	borderColor: "primary",
});

export const BackButton: React.FC<Props> = ({ href }) => {
	const { onPress } = useLink({ href });
	return <Button onPress={onPress} title={`Back to ${href}`} />;
};
