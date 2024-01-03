import React from "react";

import "array.prototype.tosorted/auto";

// This is needed for shims needed
export const ShimsProvider: React.FC<React.PropsWithChildren> = ({
	children,
}) => <>{children}</>;
