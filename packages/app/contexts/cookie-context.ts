import React from "react";

import { doNothing } from "remeda";

type SetCookieOptions = {
	maxAge?: number;
};

export type CookieContextType = {
	setCookie: <T>(key: string, value: T, options?: SetCookieOptions) => void;
	deleteCookie: (key: string) => void;
};

export const CookieContext = React.createContext<CookieContextType>({
	setCookie: doNothing,
	deleteCookie: doNothing,
});
