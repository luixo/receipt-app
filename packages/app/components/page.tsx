import React from "react";

import { styled } from "@nextui-org/react";

const Wrapper = styled("div", {
	padding: "$md",
});

type Props = {
	children: React.ReactNode;
};

export const Page: React.FC<Props> = ({ children }) => (
	<Wrapper>{children}</Wrapper>
);
