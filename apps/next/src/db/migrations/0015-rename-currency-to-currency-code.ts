import type { Database } from "..";

const renameCurrencyToCurrencyCode = async (db: Database) => {
	await db.schema
		.alterTable("debts")
		.renameColumn("currency", "currencyCode")
		.execute();
	await db.schema
		.alterTable("receipts")
		.renameColumn("currency", "currencyCode")
		.execute();
};

const renameCurrencyCodeToCurrency = async (db: Database) => {
	await db.schema
		.alterTable("receipts")
		.renameColumn("currencyCode", "currency")
		.execute();
	await db.schema
		.alterTable("debts")
		.renameColumn("currencyCode", "currency")
		.execute();
};

export const up = async (db: Database) => {
	await renameCurrencyToCurrencyCode(db);
};

export const down = async (db: Database) => {
	await renameCurrencyCodeToCurrency(db);
};
