import type React from "react";

import { Icon } from "~components/icons";
import { Link } from "~components/link";

export const BackLink: typeof Link = (props) => (
	<Link testID="back-link" color="foreground" {...props}>
		<Icon name="arrow-left" className="size-9" />
	</Link>
);
