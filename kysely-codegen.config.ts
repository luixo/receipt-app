import type { Config } from "kysely-codegen";
import { entries, fromEntries, values } from "remeda";

import type { DB } from "~db/types.gen";

const typeMapping = {
	date: "Temporal.PlainDate",
	time: "Temporal.PlainTime",
	timetz: "Temporal.ZonedTime",
	timestamp: "Temporal.PlainDateTime",
	timestamptz: "Temporal.ZonedDateTime",
};

const TYPES: Record<
	string,
	{
		expression: string;
		importSource?: string;
		tables: Partial<{
			[K in keyof DB]: (keyof DB[K])[];
		}>;
	}
> = {
	currencyCode: {
		expression: "CurrencyCode",
		importSource: "~app/utils/currency",
		tables: {
			debts: ["currencyCode"],
			receipts: ["currencyCode"],
		},
	},
	accountId: {
		expression: "AccountsId",
		importSource: "~db/models",
		tables: {
			accountConnectionsIntentions: ["accountId", "targetAccountId"],
			accountSettings: ["accountId"],
			accounts: ["id"],
			debts: ["ownerAccountId"],
			receipts: ["ownerAccountId"],
			resetPasswordIntentions: ["accountId"],
			users: ["ownerAccountId"],
		},
	},
	// Kysely can't introspect references ids yet
	accountIdNullable: {
		expression: "AccountsId | null",
		tables: {
			users: ["connectedAccountId"],
		},
	},
	debtId: {
		expression: "DebtsId",
		importSource: "~db/models",
		tables: {
			debts: ["id"],
		},
	},
	receiptItemId: {
		expression: "ReceiptItemsId",
		importSource: "~db/models",
		tables: {
			receiptItemConsumers: ["itemId"],
			receiptItems: ["id"],
		},
	},
	receiptId: {
		expression: "ReceiptsId",
		importSource: "~db/models",
		tables: {
			receiptItems: ["receiptId"],
			receiptParticipants: ["receiptId"],
			receipts: ["id"],
		},
	},
	// Kysely can't introspect references ids yet
	receiptIdNullable: {
		expression: "ReceiptsId | null",
		tables: {
			debts: ["receiptId"],
		},
	},
	sessionsSessionId: {
		expression: "SessionsSessionId",
		importSource: "~db/models",
		tables: {
			sessions: ["sessionId"],
		},
	},
	userId: {
		expression: "UsersId",
		importSource: "~db/models",
		tables: {
			accountConnectionsIntentions: ["userId"],
			debts: ["userId"],
			receiptItemConsumers: ["userId"],
			receiptParticipants: ["userId"],
			users: ["id"],
		},
	},
};

const config: Config = {
	outFile: "packages/db/src/types.gen.ts",
	singularize: true,
	customImports: {
		Temporal: "~utils/date",
		...fromEntries(
			values(TYPES)
				.filter(({ importSource }) => Boolean(importSource))
				.map(({ expression, importSource }) => [expression, importSource]),
		),
	},
	overrides: {
		columns: fromEntries(
			values(TYPES).flatMap(({ expression, tables }) =>
				entries(tables).flatMap(([tableName, columnNames]) =>
					columnNames.map(
						(columnName) => [`${tableName}.${columnName}`, expression] as const,
					),
				),
			),
		),
	},
	typeMapping,
};

export default config;
