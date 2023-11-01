import type {
	Fixtures,
	PlaywrightTestArgs,
	PlaywrightTestOptions,
	PlaywrightWorkerArgs,
	PlaywrightWorkerOptions,
	TestType,
} from "@playwright/test";

type KeyValue = { [key: string]: unknown };

type WithDefaultFixture<T> = PlaywrightTestArgs & PlaywrightTestOptions & T;
type WithDefaultWorkerFixture<T> = PlaywrightWorkerArgs &
	PlaywrightWorkerOptions &
	T;

/* eslint-disable @typescript-eslint/no-explicit-any */
type InferTestTypeFixture<T> = T extends TestType<infer U, any> ? U : never;
type InferTestTypeWorkerFixture<T> = T extends TestType<any, infer U>
	? U
	: never;
/* eslint-enable @typescript-eslint/no-explicit-any */

export const createMixin =
	<
		FT extends KeyValue,
		FW extends KeyValue = NonNullable<unknown>,
		PT extends KeyValue = NonNullable<unknown>,
		PW extends KeyValue = NonNullable<unknown>,
	>(
		fixtures: Fixtures<
			FT,
			FW,
			WithDefaultFixture<PT>,
			WithDefaultWorkerFixture<PW>
		>,
	) =>
	<
		TT extends TestType<
			WithDefaultFixture<PT>,
			WithDefaultWorkerFixture<PW>
		> = TestType<WithDefaultFixture<PT>, WithDefaultWorkerFixture<PW>>,
	>(
		base: TT,
	): TestType<
		InferTestTypeFixture<TT> & FT,
		InferTestTypeWorkerFixture<TT> & FW
	> =>
		base.extend(fixtures) as TestType<
			InferTestTypeFixture<TT> & FT,
			InferTestTypeWorkerFixture<TT> & FW
		>;
