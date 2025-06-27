import { expect, test } from "vitest";

import { getHostUrl } from "./url";

test("url is filtered out", async () => {
	const originalUrl = "http://localhost:3000/";
	const urlObject = new URL(originalUrl);
	urlObject.hash = "hash";
	urlObject.password = "password";
	urlObject.search = "?foo=bar";
	urlObject.username = "username";
	urlObject.pathname = "pathname";
	expect(getHostUrl(urlObject.toString())).toEqual(originalUrl);
});
