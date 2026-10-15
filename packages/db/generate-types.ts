import {
	AliasDeclarationNode,
	Cli,
	TypeScriptSerializer,
} from "kysely-codegen";
import type { IdentifierNode } from "kysely-codegen";
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
	userId: {
		expression: "UserId",
		importSource: "~db/ids",
		tables: {
			userSettings: ["userId"],
			sessions: ["userId"],
			users: ["id"],
			debts: ["ownerUserId"],
			receipts: ["ownerUserId"],
			resetPasswordIntentions: ["userId"],
			peers: ["ownerUserId"],
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
		importSource: "~db/ids",
		tables: {
			debts: ["id"],
		},
	},
	receiptItemId: {
		expression: "ReceiptItemId",
		importSource: "~db/ids",
		tables: {
			receiptItemConsumers: ["itemId"],
			receiptItems: ["id"],
			receiptItemPayers: ["itemId"],
		},
	},
	receiptId: {
		expression: "ReceiptId",
		importSource: "~db/ids",
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
		importSource: "~db/ids",
		tables: {
			sessions: ["sessionId"],
		},
	},
	peerId: {
		expression: "PeerId",
		importSource: "~db/ids",
		tables: {
			debts: ["peerId"],
			receiptItemConsumers: ["peerId"],
			receiptParticipants: ["peerId"],
			peers: ["id"],
			receiptItemPayers: ["peerId"],
		},
	},
};

const mapping: Partial<Record<string, string>> = {
	Receiptrole: "ReceiptRole",
};
const remapName = (name: string) => mapping[name] ?? name;

class TypeSerializer extends TypeScriptSerializer {
	public override serializeAliasDeclaration(node: AliasDeclarationNode) {
		return super.serializeAliasDeclaration(
			new AliasDeclarationNode(remapName(node.id.name), node.body),
		);
	}

	public override serializeIdentifier(node: IdentifierNode) {
		return remapName(super.serializeIdentifier(node));
	}
}

const serializer = new TypeSerializer({ singularize: true });

await new Cli().run({
	argv: process.argv.slice(2),
	config: {
		camelCase: true,
		outFile: "src/types.gen.ts",
		serializer: { serializeFile: serializer.serializeFile.bind(serializer) },
		customImports: fromEntries(
			values(TYPES).flatMap(({ expression, importSource }) =>
				importSource ? [[expression, importSource] as const] : [],
			),
		),
		overrides: {
			columns: fromEntries(
				values(TYPES).flatMap(({ expression, tables }) =>
					entries(tables).flatMap(([tableName, columnNames]) =>
						columnNames.map(
							(columnName) =>
								[`${tableName}.${columnName}`, expression] as const,
						),
					),
				),
			),
		},
		typeMapping,
	},
});
