import type React from "react";

import type { RightJoinProps } from "@heroui/react";
import { Link as LinkRaw } from "@heroui/react";
import type { CreateLinkProps, LinkProps } from "@tanstack/react-router";
import { createLink } from "@tanstack/react-router";

import { Button } from "~components/button";
import { Card } from "~components/card";

const RawLink = createLink(
	({
		testID,
		...props
	}: RightJoinProps<CreateLinkProps, React.ComponentProps<typeof LinkRaw>> & {
		testID?: string;
	}) => <LinkRaw {...props} data-testid={testID} />,
);
export type Props = Omit<LinkProps, "children" | "color"> & {
	children?: React.ReactNode;
	className?: string;
	color?: "foreground" | "primary";
	testID?: string;
};
export const Link: React.FC<Props> = RawLink;

export const ButtonLink = createLink(
	(
		props: RightJoinProps<CreateLinkProps, React.ComponentProps<typeof Button>>,
	) => <Button as={Link} {...props} />,
);
export const CardLink = createLink(
	(
		props: RightJoinProps<CreateLinkProps, React.ComponentProps<typeof Card>>,
	) => <Card as={Link} {...props} />,
);
