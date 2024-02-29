import Dataloader from "dataloader";
import fetch from "isomorphic-fetch";
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

// see https://github.com/fawazahmed0/currency-api
const CDN_BASE_URL = `https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/`;

const fetchCDNRate = async ({ fromCode, toCode }: ExchangeRateInput) => {
	const fromCodeLower = fromCode.toLowerCase();
	const toCodeLower = toCode.toLowerCase();
	const response = await fetch(
		`${CDN_BASE_URL}latest/currencies/${fromCodeLower}/${toCodeLower}.min.json`,
	);
	if (response.status !== 200) {
		throw new Error(`Response to exchange rate request is ${response.status}`);
	}
	const json = await response.json();
	const parsedJson = z
		.object({
			date: z.string().regex(/\d{4}-\d{2}-\d{2}/),
			[toCodeLower]: z.number(),
		})
		.safeParse(json);
	if (!parsedJson.success) {
		throw parsedJson.error;
	}
	return Number((parsedJson.data[toCodeLower] as number).toFixed(6));
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
	const json = await response.json();
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
			if (!acc[input.fromCode]) {
				acc[input.fromCode] = [];
			}
			if (!acc[input.fromCode]!.includes(input.toCode)) {
				acc[input.fromCode]!.push(input.toCode);
			}
			return acc;
		},
		{},
	);
	const batchResults = await Promise.all(
		Object.entries(batches).map(async ([fromCode, toCodes]) => {
			const batchResult = await fetcher(fromCode, toCodes);
			return {
				fromCode,
				toRates: toCodes.map((toCode, index) => ({
					code: toCode,
					rate: batchResult[index]!,
				})),
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
			() => Promise.all(inputs.map(fetchCDNRate)),
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
	const cacheDatabase = getCacheDatabase(ctx);
	const rates = await Promise.all(
		toCodes.map(async (toCode) => {
			const cacheKey = getKey(fromCode, toCode);
			const cachedRate = await cacheDatabase.get<number>(cacheKey);
			if (cachedRate) {
				return cachedRate;
			}
			const fetchedRate = await (ctx.exchangeRateOptions.mock
				? ctx.exchangeRateOptions.mock.fn(fromCode, toCode)
				: exchangeRateDataloader.load({
						fromCode,
						toCode,
				  }));
			cacheDatabase.setex(cacheKey, CACHE_TTL, fetchedRate).catch((e) => {
				// Failing on this action doesn't matter much
				ctx.logger.warn("Cache DB setex action failed", e);
			});
			return fetchedRate;
		}),
	);
	return toCodes.reduce<Record<CurrencyCode, number>>(
		(acc, toCode, index) => ({ ...acc, [toCode]: rates[index]! }),
		{},
	);
};
