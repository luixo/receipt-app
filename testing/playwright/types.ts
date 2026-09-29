import type { TestType } from "@playwright/test";

/* oxlint-disable typescript/no-explicit-any */
export type ExtractFixture<F extends TestType<any, any>> =
	F extends TestType<infer R, any> ? R : never;
/* oxlint-enable typescript/no-explicit-any */
