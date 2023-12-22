import * as React from "react";

import { useUpdateSearchParams } from "solito/navigation";

export const useRemoveTestQueryParams = () => {
	const updateSearchParams = useUpdateSearchParams();
	React.useEffect(() => {
		updateSearchParams({
			proxyPort: undefined,
			controllerId: undefined,
		});
	}, [updateSearchParams]);
};
