import type { TestType } from "@playwright/test";

/* oxlint-disable typescript/no-explicit-any */
export type ExtractFixture<F extends TestType<any, any>> =
	F extends TestType<infer R, any> ? R : never;
export type ExtractWorkerFixture<F extends TestType<any, any>> =
	F extends TestType<any, infer W> ? W : never;
/* oxlint-enable typescript/no-explicit-any */
