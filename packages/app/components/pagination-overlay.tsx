import type React from "react";

import { Overlay } from "#components/overlay.tsx";
import { Spinner } from "#components/spinner.tsx";
import type { ViewReactNode } from "#components/view.tsx";

type Props = {
	isPending?: boolean;
	children?: ViewReactNode;
};

export const SuspendedOverlay: React.FC<Props> = ({ isPending, children }) => (
	<Overlay
		className="gap-2"
		overlay={isPending ? <Spinner size="lg" /> : undefined}
		testID="suspended-overlay"
	>
		{children}
	</Overlay>
);
