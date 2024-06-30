import type { Database } from "~db";

const makeAutoAcceptDebtsDefault = async (db: Database) => {
	await db.schema
		.alterTable("accountSettings")
		.renameColumn("autoAcceptDebts", "manualAcceptDebts")
		.execute();
};

const makeManualAcceptDebtsDefault = async (db: Database) => {
	await db.schema
		.alterTable("accountSettings")
		.renameColumn("manualAcceptDebts", "autoAcceptDebts")
		.execute();
};

export const up = async (db: Database) => {
	await makeAutoAcceptDebtsDefault(db);
};

export const down = async (db: Database) => {
	await makeManualAcceptDebtsDefault(db);
};
