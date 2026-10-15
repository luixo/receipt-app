import type React from "react";

import type { CreateLinkProps, LinkProps } from "@tanstack/react-router";
import { createLink } from "@tanstack/react-router";

import { Button } from "~components/button";
import { Card } from "~components/card";
import { cn } from "~components/utils";

type RightJoinProps<L, R> = Omit<L, keyof R> & R;

const RawLink = ({
	testID,
	className,
	...props
}: CreateLinkProps &
	React.ComponentProps<"a"> & {
		testID?: string;
	}) => (
	<a
		{...props}
		className={cn(
			"text-blue-500 decoration-blue-500 hover:opacity-80",
			className,
		)}
		data-testid={testID}
	>
		{props.children}
	</a>
);
export type Props = Omit<LinkProps, "children" | "color"> & {
	children?: React.ReactNode;
	className?: string;
	testID?: string;
};
export const Link: React.FC<Props> = createLink(RawLink);

export const ButtonLink = createLink(
	(
		props: RightJoinProps<CreateLinkProps, React.ComponentProps<typeof Button>>,
	) => <Button as="a" {...props} />,
);
export const CardLink = createLink(
	(
		props: RightJoinProps<CreateLinkProps, React.ComponentProps<typeof Card>>,
	) => <Card as="a" {...props} />,
);
