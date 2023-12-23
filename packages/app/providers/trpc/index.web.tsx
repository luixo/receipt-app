import React from "react";

// on web, we provide trpc context via withTRPC wrapper in _app.tsx
export const TrpcProvider: React.FC<React.PropsWithChildren> = ({
	children,
}) => <>{children}</>;
