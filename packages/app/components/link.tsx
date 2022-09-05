import React from "react";

import { styled } from "@nextui-org/react";
import NextLink from "next/link";
import { useRouter } from "solito/router";

const StyledLink = styled(NextLink, {
	display: "block",
	alignItems: "inherit",
	color: "inherit",
});

type Props = Omit<React.ComponentProps<typeof StyledLink>, "href"> & {
	href: string;
};

export const Link: React.FC<Props> = React.forwardRef(
	({ href, children, ...props }, ref) => {
		const router = useRouter();
		const onClickCapture = React.useCallback(
			(e: React.MouseEvent<HTMLAnchorElement>) => {
				e.preventDefault();
				router.push(href, undefined, { shallow: true });
			},
			[router, href]
		);
		return (
			<StyledLink
				href={href}
				passHref
				legacyBehavior={false}
				onClickCapture={onClickCapture}
				{...props}
				ref={ref}
			>
				{children}
			</StyledLink>
		);
	}
);
