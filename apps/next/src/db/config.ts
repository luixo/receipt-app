import type { PoolConfig } from "pg";

export const getDatabaseConfig = (): PoolConfig => {
	if (!process.env.DATABASE_URL) {
		throw new Error("Expected to have process.env.DATABASE_URL variable!");
	}
	return {
		connectionString: process.env.DATABASE_URL,
	};
};
