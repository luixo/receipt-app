import React from "react";

import type { QueryClientsRecord } from "~app/contexts/query-clients-context";
import { useQueryClientsStore } from "~app/contexts/query-clients-context";
import { StoreDataContext } from "~app/contexts/store-data-context";
import { PRETEND_USER_STORE_NAME } from "~app/utils/store/pretend-user";

export const usePretendUserClientKey = ():
	| keyof QueryClientsRecord
	| undefined => {
	const addQueryClient = useQueryClientsStore((state) => state.addQueryClient);
	const {
		[PRETEND_USER_STORE_NAME]: [pretendUser],
	} = React.useContext(StoreDataContext);
	const pretendEmail = pretendUser.email;
	React.useEffect(() => {
		if (pretendEmail) {
			addQueryClient(pretendEmail);
		}
	}, [pretendEmail, addQueryClient]);
	return pretendEmail;
};
