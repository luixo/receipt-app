// on web, we provide trpc context via withTRPC wrapper in _app.tsx

import React from "react";

export const QueriesProvider: React.FC<React.PropsWithChildren<object>> = ({
	children,
}) => <>{children}</>;
