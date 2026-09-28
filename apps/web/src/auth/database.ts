import type { Kysely } from "kysely";

import { getDatabase } from "~db/database";

import type { AuthDB } from "./tables";

const instances = new Map<string, Kysely<AuthDB>>();

export const getAuthDatabase = (connectionString: string): Kysely<AuthDB> => {
	const existing = instances.get(connectionString);
	if (existing) {
		return existing;
	}
	const instance = getDatabase({
		connectionString,
		// Better Auth manages its own serialization (plain Date objects) and
		// relies on default node-pg type parsers (booleans, timestamps).
		// The domain instance customizes both, so auth gets a clean one.
		serialization: null,
		getTypeParser: () => undefined,
	}) as unknown as Kysely<AuthDB>;
	instances.set(connectionString, instance);
	return instance;
};

export const destroyAuthDatabase = async (connectionString: string) => {
	const instance = instances.get(connectionString);
	if (!instance) {
		return;
	}
	instances.delete(connectionString);
	await instance.destroy();
};
