import * as React from "react";

import { useRouter } from "next/router";

export const useRemoveTestQueryParams = () => {
	const router = useRouter();
	React.useEffect(() => {
		const { pathname, query } = router;
		const params = new URLSearchParams(query as Record<string, string>);
		if (!params.has("proxyPort") && !params.has("controllerId")) {
			return;
		}
		params.delete("proxyPort");
		params.delete("controllerId");
		router.replace({ pathname, query: params.toString() }, undefined, {
			shallow: true,
		});
	}, [router]);
};
