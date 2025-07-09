import { describe, expect } from "vitest";

import { test } from "~tests/backend/utils/test";
import { getServerRouteMethod } from "~web/pages/api/test.utils";

import { ServerRoute } from "./ping";

const GET = getServerRouteMethod(ServerRoute, "GET");

describe("ping", () => {
	test("pong", async () => {
		const response = await GET({
			context: undefined,
			pathname: "/api/ping",
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
