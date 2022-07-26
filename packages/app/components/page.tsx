import React from "react";

import { styled } from "@nextui-org/react";

const Wrapper = styled("div", {
	display: "flex",
	flexDirection: "column",
	padding: "$md",
});

type Props = {
	children: React.ReactNode;
};

export const Page: React.FC<Props> = ({ children }) => (
	<Wrapper css={{ maxWidth: 768, margin: "0 auto" }}>{children}</Wrapper>
);
