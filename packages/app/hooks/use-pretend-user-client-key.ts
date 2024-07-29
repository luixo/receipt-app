import React from "react";

import type { QueryClientsRecord } from "~app/contexts/query-clients-context";
import { useQueryClientsStore } from "~app/contexts/query-clients-context";
import { SSRContext } from "~app/contexts/ssr-context";
import { PRETEND_USER_COOKIE_NAME } from "~app/utils/cookie/pretend-user";

export const usePretendUserClientKey = ():
	| keyof QueryClientsRecord
	| undefined => {
	const addQueryClient = useQueryClientsStore((state) => state.addQueryClient);
	const {
		[PRETEND_USER_COOKIE_NAME]: [pretendUser],
	} = React.useContext(SSRContext);
	const pretendEmail = pretendUser.email;
	React.useEffect(() => {
		if (pretendEmail) {
			addQueryClient(pretendEmail);
		}
	}, [pretendEmail, addQueryClient]);
	return pretendEmail;
};
