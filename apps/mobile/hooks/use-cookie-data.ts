import React from "react";

import { getSSRContextCookieData } from "~app/utils/cookie-data";
import type { Cookies } from "~app/utils/trpc";
import { getCookieContext } from "~mobile/utils/cookie-storage";

export const useCookieData = () => {
	const [cookies, setCookies] = React.useState<Cookies>();
	React.useEffect(() => {
		// eslint-disable-next-line no-console
		getCookieContext().then(setCookies).catch(console.warn);
	}, []);
	const [nowTimestamp] = React.useState(() => Date.now());
	return {
		values: cookies ? getSSRContextCookieData(cookies) : undefined,
		nowTimestamp,
	};
};
