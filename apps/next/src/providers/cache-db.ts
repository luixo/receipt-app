import type { Requester } from "@upstash/redis/with-fetch";
import { Redis } from "@upstash/redis/with-fetch";

import type { UnauthorizedContext } from "next-app/handlers/context";

export type CacheDbOptions = {
	mock?: Requester;
};

let database: Redis;

export const getCacheDatabase = (ctx: UnauthorizedContext) => {
	if (ctx.cacheDbOptions.mock) {
		return new Redis(ctx.cacheDbOptions.mock);
	}
	if (database) {
		return database;
	}
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
	database = new Redis({
		url: process.env.REDIS_DATABASE_URL,
		token: process.env.REDIS_DATABASE_TOKEN,
		retry: { retries: 0 },
	});
	return database;
};
