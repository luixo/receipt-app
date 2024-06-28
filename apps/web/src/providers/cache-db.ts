import type { Requester } from "@upstash/redis/with-fetch";
import { Redis } from "@upstash/redis/with-fetch";

import type { UnauthorizedContext } from "~web/handlers/context";

export type CacheDbOptions = {
	mock?: Requester;
};

let redisInstance: Redis;

const getDatabase = (ctx: UnauthorizedContext): Redis => {
	if (ctx.cacheDbOptions.mock) {
		return new Redis(ctx.cacheDbOptions.mock);
	}
	if (!redisInstance) {
		if (!process.env.REDIS_DATABASE_URL) {
			throw new Error(
				"Expected to have process.env.REDIS_DATABASE_URL variable!",
			);
		}
		if (!process.env.REDIS_DATABASE_TOKEN) {
			throw new Error(
				"Expected to have process.env.REDIS_DATABASE_TOKEN variable!",
			);
		}
		redisInstance = new Redis({
			url: process.env.REDIS_DATABASE_URL,
			token: process.env.REDIS_DATABASE_TOKEN,
			retry: { retries: 0 },
		});
	}
	return redisInstance;
};

export const getCacheDatabase = async (
	ctx: UnauthorizedContext,
): Promise<Redis> => {
	const database = getDatabase(ctx);
	try {
		await database.ping();
		return database;
	} catch (e) {
		throw new Error(`Cache DB did not response to ping`);
	}
};
