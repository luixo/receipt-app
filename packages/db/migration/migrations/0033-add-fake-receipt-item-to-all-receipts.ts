import { sql } from "kysely";

import type { Database } from "~db/database";

const addFakeReceiptItems = async (db: Database) => {
	await db
		.insertInto("receiptItems")
		.columns([
			"id",
			"name",
			"price",
			"quantity",
			"receiptId",
			"createdAt",
			"updatedAt",
		])
		.expression((eb) =>
			eb
				.selectFrom("receipts")
				.select([
					"id",
					sql.lit("").as("name"),
					sql.lit("0").as("price"),
					sql.lit("0").as("quantity"),
					"id as receiptId",
					"createdAt",
					"createdAt as updatedAt",
				]),
		)
		.execute();
};

const removeFakeReceiptItems = async (db: Database) => {
	await db
		.deleteFrom("receiptItems")
		.where((eb) =>
			eb.and({
				price: "0",
				quantity: "0",
			}),
		)
		.execute();
};

export const up = async (db: Database) => {
	await addFakeReceiptItems(db);
};

export const down = async (db: Database) => {
	await removeFakeReceiptItems(db);
};
