import * as React from "react";

import { noop } from "app/utils/utils";

type SetCookieOptions = {
	maxAge?: number;
};

export type CookieContextType = {
	setCookie: <T>(key: string, value: T, options?: SetCookieOptions) => void;
	deleteCookie: (key: string) => void;
};

export const CookieContext = React.createContext<CookieContextType>({
	setCookie: noop,
	deleteCookie: noop,
});
