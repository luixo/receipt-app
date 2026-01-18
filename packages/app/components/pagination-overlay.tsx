import type React from "react";

import { Overlay } from "~components/overlay";
import { Spinner } from "~components/spinner";
import type { ViewReactNode } from "~components/view";

type Props = {
	isPending?: boolean;
	children?: ViewReactNode;
};

export const SuspendedOverlay: React.FC<Props> = ({ isPending, children }) => (
	<Overlay
		className="gap-2"
		overlay={isPending ? <Spinner size="lg" /> : undefined}
	>
		{children}
	</Overlay>
);
