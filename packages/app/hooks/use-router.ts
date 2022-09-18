import React from "react";

import { useRouter as useRawRouter } from "next/router";

export const useRouter = () => {
	const router = useRawRouter();
	return React.useMemo(
		() => ({
			push: (url: string) => router.push(url, undefined, { shallow: true }),
			replace: (url: string) =>
				router.replace(url, undefined, { shallow: true }),
		}),
		[router]
	);
};
