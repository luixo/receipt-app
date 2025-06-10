import React from "react";

import type { QueryClientsRecord } from "~app/contexts/query-clients-context";
import { SELF_QUERY_CLIENT_KEY } from "~app/contexts/query-clients-context";
import { StoreDataContext } from "~app/contexts/store-data-context";
import { PRETEND_USER_STORE_NAME } from "~app/utils/store/pretend-user";

type Props = {
	Wrapper: React.FC<
		React.PropsWithChildren<{ queryClientKey: keyof QueryClientsRecord }>
	>;
};

export const QueryProviderWithPretend: React.FC<
	React.PropsWithChildren<Props>
> = ({ Wrapper, children }) => {
	const {
		[PRETEND_USER_STORE_NAME]: [pretendUser],
	} = React.useContext(StoreDataContext);
	return (
		<Wrapper queryClientKey={pretendUser.email || SELF_QUERY_CLIENT_KEY}>
			{children}
		</Wrapper>
	);
};
