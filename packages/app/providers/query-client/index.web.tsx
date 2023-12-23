import React from "react";

// on web, we provide query client context via withTRPC wrapper in _app.tsx
export const QueryClientProvider: React.FC<React.PropsWithChildren> = ({
	children,
}) => <>{children}</>;
