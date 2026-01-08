import type React from "react";

import type { RightJoinProps } from "@heroui/react";
import { Card, Link as LinkRaw } from "@heroui/react";
import type { CreateLinkProps } from "@tanstack/react-router";
import { createLink } from "@tanstack/react-router";

import { Button } from "~components/button";
import { Icon } from "~components/icons";

export const Link = createLink(LinkRaw);

export const BackLink = createLink((props) => (
	<Link data-testid="back-link" color="foreground" {...props}>
		<Icon name="arrow-left" className="size-9" />
	</Link>
));

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
