import React from "react";

import { setCookies } from "cookies-next";

import {
	SSR_CONTEXT_COOKIE_NAME,
	getSSRContextCookieData,
} from "app/contexts/ssr-context";
import { YEAR } from "app/utils/time";

export const useSSRContextCookies = () => {
	const [ssrContextCookieData] = React.useState(getSSRContextCookieData);
	React.useEffect(() => {
		setCookies(SSR_CONTEXT_COOKIE_NAME, ssrContextCookieData, {
			path: "/",
			maxAge: YEAR,
		});
	}, [ssrContextCookieData]);
};
