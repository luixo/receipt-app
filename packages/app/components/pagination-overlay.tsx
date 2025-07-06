import type React from "react";

import { Overlay } from "~components/overlay";
import { Spinner } from "~components/spinner";

type Props = {
	pagination: React.ReactNode;
	isPending?: boolean;
};

export const PaginationOverlay: React.FC<React.PropsWithChildren<Props>> = ({
	pagination,
	isPending,
	children,
}) => (
	<>
		{pagination}
		<Overlay
			className="gap-2"
			overlay={isPending ? <Spinner size="lg" /> : undefined}
		>
			{children}
		</Overlay>
		{pagination}
	</>
);
