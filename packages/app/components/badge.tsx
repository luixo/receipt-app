import React from "react";

import { styled } from "@nextui-org/react";

const Relative = styled("div", {
	position: "relative",
});

const Wrapper = styled("div", {
	size: 24,
	background: "$error",
	borderRadius: "50%",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	fontWeight: "$semibold",
	fontSize: "$sm",
	dropShadow: "$md",
	shadow: "$md",
	color: "$backgroundContrast",
	position: "absolute",
	top: 0,
	right: 0,
	transform: "translate(40%, -40%)",
	zIndex: "$2",
});

type Props = {
	amount: number;
} & React.ComponentProps<typeof Relative>;

export const Badge: React.FC<Props> = ({ children, amount, ...props }) => (
	<Relative {...props}>
		{children}
		{amount !== 0 ? <Wrapper>{amount}</Wrapper> : null}
	</Relative>
);
