import type { Selection } from "kysely";
import type { z } from "zod";

import type { Database, ReceiptsSelectExpression } from "next-app/db";
import type { AccountsId, ReceiptsId } from "next-app/db/models";
import type { ReceiptsDatabase } from "next-app/db/types";
import { roleSchema } from "next-app/handlers/validation";

export type Role = z.infer<typeof roleSchema>;

export const getAccessRole = async (
	database: Database,
	receipt: { ownerAccountId: string; id: string },
	accountId: string,
): Promise<Role | undefined> => {
	if (receipt.ownerAccountId === accountId) {
		return "owner";
	}
	const participant = await database
		.selectFrom("receiptParticipants")
		.innerJoin("users", (jb) =>
			jb.onRef("users.id", "=", "receiptParticipants.userId"),
		)
		.innerJoin("accounts", (jb) =>
			jb.onRef("accounts.id", "=", "users.connectedAccountId"),
		)
		.where((eb) =>
			eb.and({
				"accounts.id": accountId,
				receiptId: receipt.id,
			}),
		)
		.select("role")
		.executeTakeFirst();
	if (!participant) {
		return;
	}
	const parsed = roleSchema.safeParse(participant.role);
	/* c8 ignore start */
	if (!parsed.success) {
		// TODO: add database-level validation
		return;
	}
	/* c8 ignore stop */
	return parsed.data;
};

export const getReceiptById = <SE extends ReceiptsSelectExpression<"receipts">>(
	database: Database,
	id: ReceiptsId,
	selectExpression: SE[],
): Promise<Selection<ReceiptsDatabase, "receipts", SE> | undefined> =>
	database
		.selectFrom("receipts")
		.select(selectExpression)
		.where("id", "=", id)
		.executeTakeFirst();

export const getOwnReceipts = (
	database: Database,
	ownerAccountId: AccountsId,
) =>
	database.selectFrom("receipts").where("ownerAccountId", "=", ownerAccountId);

export const getForeignReceipts = (
	database: Database,
	ownerAccountId: AccountsId,
) =>
	database
		.selectFrom("users")
		.where((eb) =>
			eb("users.connectedAccountId", "=", ownerAccountId).and(
				"users.ownerAccountId",
				"<>",
				ownerAccountId,
			),
		)
		.innerJoin("receiptParticipants", (jb) =>
			jb.onRef("receiptParticipants.userId", "=", "users.id"),
		)
		.innerJoin("receipts", (jb) =>
			jb.onRef("receipts.id", "=", "receiptParticipants.receiptId"),
		);
