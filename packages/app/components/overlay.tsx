import React from "react";

import { styled } from "@nextui-org/react";

const Wrapper = styled("div", {
	position: "relative",
	display: "flex",
	flexDirection: "column",
});

const OverlayElement = styled("div", {
	position: "absolute",
	left: 0,
	right: 0,
	top: 0,
	bottom: 0,
	backgroundColor: "$neutral",
	opacity: 0.3,
	borderRadius: "$md",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	zIndex: "$2",
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
