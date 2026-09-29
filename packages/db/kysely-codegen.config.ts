import { defineConfig } from "kysely-codegen";
import { entries, fromEntries, values } from "remeda";

import type { DB } from "#db/types.gen.ts";

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
		importSource: "#app/utils/currency.ts",
		tables: {
			debts: ["currencyCode"],
			receipts: ["currencyCode"],
		},
	},
	userId: {
		expression: "UserId",
		importSource: "#db/ids.ts",
		tables: {
			userSettings: ["userId"],
			users: ["id"],
			debts: ["ownerUserId"],
			receipts: ["ownerUserId"],
			resetPasswordIntentions: ["userId"],
			peers: ["ownerUserId"],
			sessions: ["userId"],
		},
	},
	// Kysely can't introspect references ids yet
	userIdNullable: {
		expression: "UserId | null",
		tables: {
			peers: ["connectedUserId"],
		},
	},
	debtId: {
		expression: "DebtId",
		importSource: "#db/ids.ts",
		tables: {
			debts: ["id"],
		},
	},
	receiptItemId: {
		expression: "ReceiptItemId",
		importSource: "#db/ids.ts",
		tables: {
			receiptItemConsumers: ["itemId"],
			receiptItems: ["id"],
			receiptItemPayers: ["itemId"],
		},
	},
	receiptId: {
		expression: "ReceiptId",
		importSource: "#db/ids.ts",
		tables: {
			receiptItems: ["receiptId"],
			receiptParticipants: ["receiptId"],
			receipts: ["id"],
		},
	},
	// Kysely can't introspect references ids yet
	receiptIdNullable: {
		expression: "ReceiptId | null",
		tables: {
			debts: ["receiptId"],
		},
	},
	sessionsSessionId: {
		expression: "SessionId",
		importSource: "#db/ids.ts",
		tables: {
			sessions: ["sessionId"],
		},
	},
	peerId: {
		expression: "PeerId",
		importSource: "#db/ids.ts",
		tables: {
			debts: ["peerId"],
			receiptItemConsumers: ["peerId"],
			receiptParticipants: ["peerId"],
			peers: ["id"],
			receiptItemPayers: ["peerId"],
		},
	},
};

export default defineConfig({
	outFile: "src/types.gen.ts",
	singularize: true,
	customImports: {
		...fromEntries(
			values(TYPES).flatMap(({ expression, importSource }) =>
				importSource ? [[expression, importSource] as const] : [],
			),
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
});
