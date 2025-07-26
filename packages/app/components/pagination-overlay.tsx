import type React from "react";

import { Overlay } from "~components/overlay";
import { Spinner } from "~components/spinner";

type Props = {
	isPending?: boolean;
};

export const SuspendedOverlay: React.FC<React.PropsWithChildren<Props>> = ({
	isPending,
	children,
}) => (
	<Overlay
		className="gap-2"
		overlay={isPending ? <Spinner size="lg" /> : undefined}
	>
		{children}
	</Overlay>
);
