import { Redis } from "@upstash/redis/with-fetch";

if (!process.env.REDIS_DATABASE_URL) {
	throw new Error("Expected to have process.env.REDIS_DATABASE_URL variable!");
}
if (!process.env.REDIS_DATABASE_TOKEN) {
	throw new Error(
		"Expected to have process.env.REDIS_DATABASE_TOKEN variable!"
	);
}

export const cacheDatabase = new Redis({
	url: process.env.REDIS_DATABASE_URL,
	token: process.env.REDIS_DATABASE_TOKEN,
});
