import { describe, expect, test } from "vitest";

import { getHostUrl } from "./url";

describe("Url utility", () => {
	test("url is filtered out", () => {
		const originalUrl = "http://localhost:3000/";
		const urlObject = new URL(originalUrl);
		urlObject.hash = "hash";
		urlObject.password = "password";
		urlObject.search = "?foo=bar";
		urlObject.username = "username";
		urlObject.pathname = "pathname";
		expect(getHostUrl(urlObject.toString())).toStrictEqual(originalUrl);
	});
});
