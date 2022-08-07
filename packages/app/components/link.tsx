import React from "react";

import { styled } from "@nextui-org/react";
import NextLink from "next/link";

const StyledLink = styled(NextLink);

type Props = Omit<React.ComponentProps<typeof StyledLink>, "href"> & {
	href: string;
};

export const Link: React.FC<Props> = ({ href, children, ...props }) => (
	<StyledLink shallow href={href} {...props}>
		{children}
	</StyledLink>
);
