import { assert, describe, expect } from "vitest";

import { test } from "~tests/backend/utils/test";

import { APIRoute } from "./ping";

const { GET } = APIRoute.methods;
assert(GET);

describe("ping", () => {
	test("pong", async () => {
		const response = await GET({
			request: new Request("http://localhost:3000/"),
			params: {},
		});
		const result = {
			status: response.status,
			data: await response.text(),
		};
		expect(result).toEqual<typeof result>({
			status: 200,
			data: "Pong",
		});
	});
});
