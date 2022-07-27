import React from "react";

import { Button, Loading, Link } from "@nextui-org/react";

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
	const button = (
		<Button
			auto
			{...props}
			css={{ $$buttonPadding: 0, ...props.css }}
			icon={isLoading ? <Loading size="xs" /> : props.icon}
		>
			{isLoading ? undefined : props.children}
		</Button>
	);
	if (href) {
		return (
			<Link href={href} style={linkStyle}>
				{button}
			</Link>
		);
	}
	return button;
};
