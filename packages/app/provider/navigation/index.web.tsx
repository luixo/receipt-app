// on Web, we don't use React Navigation, so we avoid the provider altogether
// instead, we just have a no-op here
// for more, see: https://solito.dev/recipes/tree-shaking

import React from "react";

export const NavigationProvider: React.FC<React.PropsWithChildren<object>> = ({
	children,
}) => <>{children}</>;
