import * as React from "react";

import { useQueryState } from "~app/hooks/use-navigation";

export const useRemoveTestQueryParams = () => {
	const [, setProxyPort] = useQueryState("proxyPort");
	const [, setControllerId] = useQueryState("controllerId");
	React.useEffect(() => {
		void setProxyPort(null);
		void setControllerId(null);
	}, [setControllerId, setProxyPort]);
};
