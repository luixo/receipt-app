import { ServerResponse } from "http";
import { setCookie } from "./cookie";

export const AUTH_COOKIE = "authToken";

export const setAuthCookie = (
	res: ServerResponse,
	authToken: string,
	expirationDate: Date
) => {
	setCookie(res, AUTH_COOKIE, authToken, {
		httpOnly: true,
		expires: expirationDate,
		path: "/",
	});
};

export const resetAuthCookie = (res: ServerResponse) => {
	return setAuthCookie(res, "", new Date());
};
