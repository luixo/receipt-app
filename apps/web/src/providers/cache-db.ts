import { createClient } from "redis";

import { env } from "~utils/env";
import type { UnauthorizedContext } from "~web/handlers/context";

export type CacheDbOptions = {
	mock?: CacheInstance;
};

export type CacheInstance = {
	getValue: (key: string) => Promise<string | null>;
	setValue: (
		key: string,
		value: string,
		opts?: { expiryInS?: number },
	) => Promise<void>;
};

const getRedisInstance = async (): Promise<CacheInstance> => {
	const database = createClient({
		url: env.CACHE_DATABASE_URL,
		socket: {
			reconnectStrategy: false,
		},
	});
	try {
		await database.connect();
		return {
			getValue: (key) => database.get(key),
			setValue: async (key, value, opts) => {
				if (opts?.expiryInS) {
					await database.setEx(key, opts.expiryInS, value);
				}
				await database.set(key, value);
			},
		};
	} catch {
		throw new Error(`Cache DB did not response to ping`);
	}
};

let cacheInstance: CacheInstance | undefined;

export const getCacheInstance = async (
	ctx: UnauthorizedContext,
): Promise<CacheInstance> => {
	if (ctx.cacheDbOptions.mock) {
		return ctx.cacheDbOptions.mock;
	}

	if (!cacheInstance) {
		try {
			cacheInstance = await getRedisInstance();
			return cacheInstance;
		} catch {
			throw new Error(`Cache DB did not response to ping`);
		}
	}
	return cacheInstance;
};
