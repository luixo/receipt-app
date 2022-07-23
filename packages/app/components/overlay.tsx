import React from "react";
import * as ReactNative from "react-native";

import { styled } from "app/utils/styles";

const Wrapper = styled(ReactNative.View)({
	position: "relative",
});

const OverlayElement = styled(ReactNative.View)({
	...ReactNative.StyleSheet.absoluteFillObject,
	backgroundColor: "overlay",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	zIndex: "max",
});

type Props = {
	children: React.ReactNode;
	overlay?: React.ReactNode;
};

export const Overlay: React.FC<Props> = ({ children, overlay }) => (
	<Wrapper>
		{children}
		{overlay ? <OverlayElement>{overlay}</OverlayElement> : null}
	</Wrapper>
);
