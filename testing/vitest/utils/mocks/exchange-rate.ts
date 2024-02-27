import type { AddParameters } from "~app/utils/types";
import type { ExchangeRateOptions } from "~web/providers/exchange-rate";

export type ExchangeRateOptionsMock = ExchangeRateOptions & {
	broken: boolean;
	mock: ExchangeRateOptions["mock"] & {
		addInterceptor: (interceptor: Interceptor) => void;
		removeInterceptor: (interceptor: Interceptor) => void;
	};
};
type ExchangeRateFn = NonNullable<ExchangeRateOptions["mock"]>["fn"];
type ExchangeRateResult = Awaited<ReturnType<ExchangeRateFn>>;
type Interceptor = AddParameters<ExchangeRateFn, [next: () => void]>;
export const getExchangeRateOptions = (): ExchangeRateOptionsMock => {
	let interceptors: Interceptor[] = [async () => 1];
	let innerBroken = false;
	return {
		get broken() {
			return innerBroken;
		},
		set broken(value) {
			innerBroken = value;
		},
		mock: {
			fn: async (from, to) => {
				if (innerBroken) {
					throw new Error("Test context broke exchange rate service error");
				}
				let shouldContinue = false;
				const next = () => {
					shouldContinue = true;
				};
				let lastResult: ExchangeRateResult;
				// eslint-disable-next-line no-restricted-syntax
				for (const interceptor of interceptors) {
					// eslint-disable-next-line no-await-in-loop
					lastResult = await interceptor(from, to, next);
					if (!shouldContinue) {
						return lastResult;
					}
				}
				return lastResult!;
			},
			addInterceptor: (interceptor: Interceptor) => {
				interceptors.unshift(interceptor);
			},
			removeInterceptor: (interceptor: Interceptor) => {
				interceptors = interceptors.filter(
					(lookupInterceptor) => lookupInterceptor !== interceptor,
				);
			},
		},
	};
};
