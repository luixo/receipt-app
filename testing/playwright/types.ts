import type { TestType } from "@playwright/test";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type ExtractFixture<F extends TestType<any, any>> = F extends TestType<
	infer R,
	any
>
	? R
	: never;
export type ExtractWorkerFixture<F extends TestType<any, any>> =
	F extends TestType<any, infer W> ? W : never;
/* eslint-enable @typescript-eslint/no-explicit-any */
