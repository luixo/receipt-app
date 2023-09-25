// on web, we provide trpc context via withTRPC wrapper in _app.tsx

import React from "react";

import { SSRContext } from "app/contexts/ssr-context";

import type { Props } from "./index";

export const SSRProvider: React.FC<React.PropsWithChildren<Props>> = ({
	children,
	...ssrContext
}) => {
	const [isMounted, setMounted] = React.useState(false);
	React.useEffect(() => setMounted(true), []);
	return (
		<SSRContext.Provider
			value={React.useMemo(
				() => ({ isFirstRender: !isMounted, ...ssrContext }),
				[ssrContext, isMounted],
			)}
		>
			{children}
		</SSRContext.Provider>
	);
};
