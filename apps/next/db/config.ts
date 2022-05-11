import { PostgresDialectConfig } from "kysely";

export const getDatabaseConfig = (): PostgresDialectConfig => {
	if (!process.env.POSTGRES_HOST) {
		throw new Error("Expected to have process.env.POSTGRES_HOST variable!");
	}
	if (!process.env.POSTGRES_USER) {
		throw new Error("Expected to have process.env.POSTGRES_USER variable!");
	}
	if (!process.env.POSTGRES_PASSWORD) {
		throw new Error("Expected to have process.env.POSTGRES_PASSWORD variable!");
	}
	if (!process.env.POSTGRES_DATABASE) {
		throw new Error("Expected to have process.env.POSTGRES_DATABASE variable!");
	}
	return {
		host: process.env.POSTGRES_HOST,
		port: Number(process.env.POSTGRES_PORT) || 6432,
		user: process.env.POSTGRES_USER,
		password: process.env.POSTGRES_PASSWORD,
		database: process.env.POSTGRES_DATABASE,
	};
};
