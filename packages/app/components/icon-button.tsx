import React from "react";

import { Button, Loading } from "@nextui-org/react";

import { Link } from "app/components/link";

type Props = React.ComponentProps<typeof Button> & {
	isLoading?: boolean;
	href?: string;
};

export const IconButton: React.FC<Props> = React.forwardRef(
	({ isLoading, href, ...props }, ref) => {
		const button = (
			<Button
				auto
				{...props}
				css={{ $$buttonPadding: 0, ...props.css }}
				icon={
					isLoading ? (
						<Loading
							size="xs"
							color={
								!props.color || props.color === "primary" ? "white" : undefined
							}
						/>
					) : (
						props.icon
					)
				}
				ref={ref}
			>
				{isLoading ? undefined : props.children}
			</Button>
		);
		if (href && !props.disabled) {
			return <Link href={href}>{button}</Link>;
		}
		return button;
	},
);
