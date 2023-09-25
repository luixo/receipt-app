import React from "react";

import type { SSRContextData } from "app/contexts/ssr-context";

export type Props = SSRContextData;

export const SSRProvider: React.FC<React.PropsWithChildren<Props>> = ({
	children,
}) => <>{children}</>;
