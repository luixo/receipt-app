import type React from "react";

import type { LinkComponent } from "@tanstack/react-router";

import { Icon } from "~components/icons";
import { Link } from "~components/link";

export const BackLink: LinkComponent<typeof Link> = (props) => (
	<Link data-testid="back-link" color="foreground" {...props}>
		<Icon name="arrow-left" className="size-9" />
	</Link>
);
