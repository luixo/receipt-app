import React from "react";

import { Button, Loading, Link, styled } from "@nextui-org/react";

const ButtonLikeLoading = styled(Loading, {
	px: "$9",
	display: "flex",
	justifyContent: "center",
});

type Props = React.ComponentProps<typeof Button> & {
	isLoading?: boolean;
	href?: string;
	linkStyle?: React.CSSProperties;
};

export const IconButton: React.FC<Props> = ({
	isLoading,
	href,
	linkStyle,
	...props
}) => {
	if (isLoading) {
		return <ButtonLikeLoading size="xs" />;
	}
	const button = <Button auto {...props} />;
	if (href) {
		return (
			<Link href={href} style={linkStyle}>
				{button}
			</Link>
		);
	}
	return button;
};
