import React from "react";

import { styled } from "@nextui-org/react";
import NextLink from "next/link";

const StyledLink = styled("a", {
	display: "block",
	alignItems: "inherit",
	color: "inherit",
});

type Props = Omit<React.ComponentProps<typeof StyledLink>, "href"> & {
	href: string;
};

export const Link: React.FC<Props> = React.forwardRef(
	({ href, children, className, ...props }, ref) => (
		<NextLink shallow href={href} {...props} ref={ref} passHref>
			<StyledLink className={className}>{children}</StyledLink>
		</NextLink>
	)
);
