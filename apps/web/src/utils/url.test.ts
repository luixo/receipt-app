import { describe, expect } from "vitest";

import { test } from "~tests/backend/utils/test";

import { getHostUrl, getServerHostUrl } from "./url";

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

	test.each([
		["https", "https://receipt.luixo.me/"],
		["http", "http://receipt.luixo.me/"],
		["invalid", "http://receipt.luixo.me/"],
	])("resolves forwarded protocol %s", (protocol, expected) => {
		const request = new Request("http://receipt.luixo.me/receipts?foo=bar", {
			headers: { "x-forwarded-proto": protocol },
		});
		expect(getServerHostUrl(request)).toBe(expected);
	});

	test("preserves the origin without a reverse proxy", () => {
		expect(
			getServerHostUrl(new Request("http://localhost:3000/receipts")),
		).toBe("http://localhost:3000/");
	});
});
