import type React from "react";

import { Icon } from "#components/icons.tsx";
import { Link } from "#components/link.tsx";

export const BackLink: typeof Link = (props) => (
	<Link testID="back-link" color="foreground" {...props}>
		<Icon name="arrow-left" className="size-9" />
	</Link>
);
