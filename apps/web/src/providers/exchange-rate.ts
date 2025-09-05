import type { Redis } from "@upstash/redis/nodejs";
import Dataloader from "dataloader";
import fetch from "isomorphic-fetch";
import { entries, keys } from "remeda";
import { z } from "zod";

import type { CurrencyCode } from "~app/utils/currency";
import type { UnauthorizedContext } from "~web/handlers/context";
import { getCacheDatabase } from "~web/providers/cache-db";

export type ExchangeRateOptions = {
	mock?: {
		fn: (from: CurrencyCode, to: CurrencyCode) => Promise<number>;
	};
};

type ExchangeRateInput = { fromCode: CurrencyCode; toCode: CurrencyCode };

// see https://github.com/fawazahmed0/exchange-api
const CDN_MAIN_BASE_URL = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/{fromCode}.min.json`;
// see https://github.com/fawazahmed0/exchange-api/blob/main/README.md#additional-fallback-url-on-cloudflare
const CDN_BACKUP_BASE_URL = `https://latest.currency-api.pages.dev/v1/currencies/{fromCode}.min.json`;

const fetchCDNRate =
	(baseUrl: string) =>
	async (fromCode: CurrencyCode, toCodes: CurrencyCode[]) => {
		const fromCodeLower = fromCode.toLowerCase();
		const toCodesLower = toCodes.map((code) => code.toLowerCase()) as [
			string,
			...string[],
		];
		const response = await fetch(baseUrl.replace("{fromCode}", fromCodeLower));
		if (response.status !== 200) {
			throw new Error(
				`Response to exchange rate request is ${response.status}`,
			);
		}
		const json: unknown = await response.json();
		const parsedJson = z
			.object({
				[fromCodeLower]: z.record(z.string(), z.float32()).refine((obj) => {
					const actualKeys = keys(obj);
					return toCodesLower.every((code) => actualKeys.includes(code));
				}),
			})
			.safeParse(json);
		if (!parsedJson.success) {
			throw parsedJson.error;
		}
		return toCodesLower.map((toCodeLower) =>
			Number(
				// We just verified it exists
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				parsedJson.data[fromCodeLower]![toCodeLower]!.toFixed(6),
			),
		);
	};

// see https://www.exchangerate-api.com/docs/standard-requests
const ERA_BASE_URL = "https://v6.exchangerate-api.com/v6/";
const fetchERARate = async (
	fromCode: CurrencyCode,
	toCodes: CurrencyCode[],
) => {
	const { ERA_API_KEY } = process.env;
	if (!ERA_API_KEY) {
		throw new Error(`Expected to have process.env.ERA_API_KEY`);
	}
	const fromCodeUpper = fromCode.toUpperCase();
	const toCodesUpper = toCodes.map((code) => code.toUpperCase());
	const response = await fetch(
		`${ERA_BASE_URL}${ERA_API_KEY}/latest/${fromCodeUpper}`,
	);
	if (response.status !== 200) {
		throw new Error(`Response to exchange rate request is ${response.status}`);
	}
	const json: unknown = await response.json();
	const parsedJson = z
		.discriminatedUnion("result", [
			z.object({
				result: z.literal("success"),
				base_code: z.literal(fromCodeUpper),
				conversion_rates: z.record(z.string(), z.number()),
			}),
			z.object({
				result: z.literal("error"),
				"error-type": z.string(),
			}),
		])
		.safeParse(json);
	if (!parsedJson.success) {
		throw parsedJson.error;
	}
	const { data } = parsedJson;
	if (data.result === "error") {
		throw new Error(`Error fetching ERA result: "${data["error-type"]}"`);
	}
	return toCodesUpper.map((toCodeUpper) => {
		const matchedRate = data.conversion_rates[toCodeUpper];
		if (!matchedRate) {
			throw new Error(
				`Error getting ERA rate for "${fromCodeUpper}" -> "${toCodeUpper}"`,
			);
		}
		return Number(matchedRate.toFixed(6));
	});
};

const fetchWithBatches = async (
	inputs: readonly ExchangeRateInput[],
	fetcher: (
		fromCode: CurrencyCode,
		toCodes: CurrencyCode[],
	) => Promise<number[]>,
) => {
	const batches = inputs.reduce<Record<CurrencyCode, CurrencyCode[]>>(
		(acc, input) => {
			const batch = acc[input.fromCode] || [];
			if (!batch.includes(input.toCode)) {
				batch.push(input.toCode);
			}
			acc[input.fromCode] = batch;
			return acc;
		},
		{},
	);
	const batchResults = await Promise.all(
		entries(batches).map(async ([fromCode, toCodes]) => {
			const batchResult = await fetcher(fromCode, toCodes);
			return {
				fromCode,
				toRates: toCodes.map((toCode, index) => {
					const toRate = batchResult[index];
					if (toRate === undefined) {
						throw new Error("Expected length to match in response");
					}
					return {
						code: toCode,
						rate: toRate,
					};
				}),
			};
		}),
	);
	return inputs.map((input) => {
		const matchedBatch = batchResults.find(
			({ fromCode }) => fromCode === input.fromCode,
		);
		if (!matchedBatch) {
			throw new Error(`No batch from code "${input.fromCode}"`);
		}
		const matchedRate = matchedBatch.toRates.find(
			({ code }) => code === input.toCode,
		);
		if (!matchedRate) {
			throw new Error(
				`No batch from code "${input.fromCode}" to code "${input.toCode}"`,
			);
		}
		return matchedRate.rate;
	});
};

const fetchPipeline = (fetchers: (() => Promise<number[]>)[]) =>
	fetchers.reduce<Promise<number[] | Error[]>>(async (acc, fetcher) => {
		const results = await acc;
		try {
			if (typeof results[0] !== "number") {
				return await fetcher();
			}
			return results;
		} catch (error) {
			return [...(results as Error[]), error as Error];
		}
	}, Promise.resolve([]));

const SCHEDULE_DELAY = 100;

const exchangeRateDataloader = new Dataloader<
	ExchangeRateInput,
	number,
	string
>(
	async (inputs) => {
		const result = await fetchPipeline([
			() => fetchWithBatches(inputs, fetchCDNRate(CDN_MAIN_BASE_URL)),
			() => fetchWithBatches(inputs, fetchCDNRate(CDN_BACKUP_BASE_URL)),
			() => fetchWithBatches(inputs, fetchERARate),
		]);
		if (typeof result[0] === "number") {
			return result;
		}
		throw new AggregateError(
			result,
			"All exchange rate resolution options failed",
		);
	},
	{
		batchScheduleFn: (callback) => setTimeout(callback, SCHEDULE_DELAY),
		cacheKeyFn: JSON.stringify,
		name: "exchange-rate",
	},
);

// Minutes
const CACHE_TTL = 24 * 60;

const getKey = (fromCode: CurrencyCode, toCode: CurrencyCode): string =>
	`${fromCode}->${toCode}`;

export const getExchangeRates = async (
	ctx: UnauthorizedContext,
	fromCode: CurrencyCode,
	toCodes: CurrencyCode[],
): Promise<Record<CurrencyCode, number>> => {
	let cacheDatabase: Redis | null = null;
	try {
		cacheDatabase = await getCacheDatabase(ctx);
	} catch {
		/* empty */
	}
	const rates = await Promise.all(
		toCodes.map(async (toCode) => {
			const cacheKey = getKey(fromCode, toCode);
			const cachedRate = cacheDatabase
				? await cacheDatabase.get<number>(cacheKey)
				: null;
			if (cachedRate) {
				return { toCode, rate: cachedRate };
			}
			const fetchedRate = await (ctx.exchangeRateOptions.mock
				? ctx.exchangeRateOptions.mock.fn(fromCode, toCode)
				: exchangeRateDataloader.load({
						fromCode,
						toCode,
					}));
			cacheDatabase?.setex(cacheKey, CACHE_TTL, fetchedRate).catch((e) => {
				// Failing on this action doesn't matter much
				ctx.logger.warn("Cache DB setex action failed", e);
			});
			return { toCode, rate: fetchedRate };
		}),
	);
	return rates.reduce<Record<CurrencyCode, number>>(
		(acc, { toCode, rate }) => ({ ...acc, [toCode]: rate }),
		{},
	);
};
