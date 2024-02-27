import React from "react";

import { CookieContext } from "~app/contexts/cookie-context";
import { nextCookieContext } from "~web/utils/client-cookies";

import type { Props } from "./index";

export const CookieProvider: React.FC<Props> = ({ children }) => (
	<CookieContext.Provider value={nextCookieContext}>
		{children}
	</CookieContext.Provider>
);
