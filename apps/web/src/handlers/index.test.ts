import { describe, expect } from "vitest";

import { test } from "~tests/backend/utils/test";

import { router } from "./index";

describe("router index", () => {
	test("fake test", async () => {
		// This fake test is needed to include all the sub-routers and procedures in the coverage
		expect(router).toBeTruthy();
	});
});
