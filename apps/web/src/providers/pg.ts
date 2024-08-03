import { Pool } from "pg";

let sharedPool: Pool | undefined;
export const getPool = () => {
	if (sharedPool) {
		return sharedPool;
	}
	if (!process.env.DATABASE_URL) {
		throw new Error("Expected to have process.env.DATABASE_URL variable!");
	}
	sharedPool = new Pool({ connectionString: process.env.DATABASE_URL });
	return sharedPool;
};
