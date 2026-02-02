import type React from "react";

import { Pagination as PaginationRaw } from "@heroui/pagination";

export type Props = Pick<
	React.ComponentProps<typeof PaginationRaw>,
	| "className"
	| "isDisabled"
	| "total"
	| "page"
	| "siblings"
	| "boundaries"
	| "showControls"
	| "dotsJump"
	| "loop"
	| "onChange"
>;
export const Pagination: React.FC<Props> = (props) => (
	<PaginationRaw color="primary" variant="bordered" size="lg" {...props} />
);
