import { Selection } from "kysely";
import { z } from "zod";

import {
	ReceiptsSelectExpression,
	ReceiptsDatabase,
	Database,
} from "next-app/db";
import { AccountsId, ReceiptsId } from "next-app/db/models";
import { roleSchema } from "next-app/handlers/validation";

export type Role = z.infer<typeof roleSchema>;

export const getAccessRole = async (
	database: Database,
	receipt: { ownerAccountId: string; id: string },
	accountId: string
): Promise<Role | undefined> => {
	if (receipt.ownerAccountId === accountId) {
		return "owner";
	}
	const participant = await database
		.selectFrom("receiptParticipants")
		.innerJoin("users", (jb) =>
			jb.onRef("users.id", "=", "receiptParticipants.userId")
		)
		.innerJoin("accounts", (jb) =>
			jb.onRef("accounts.id", "=", "users.connectedAccountId")
		)
		.where("accounts.id", "=", accountId)
		.where("receiptParticipants.receiptId", "=", receipt.id)
		.select("role")
		.executeTakeFirst();
	if (!participant) {
		return;
	}
	const parsed = roleSchema.safeParse(participant.role);
	if (!parsed.success) {
		// TODO: add database-level validation
		return;
	}
	return parsed.data;
};

export const getReceiptById = <SE extends ReceiptsSelectExpression<"receipts">>(
	database: Database,
	id: ReceiptsId,
	selectExpression: SE[]
): Promise<Selection<ReceiptsDatabase, "receipts", SE> | undefined> =>
	database
		.selectFrom("receipts")
		.select(selectExpression)
		.where("id", "=", id)
		.executeTakeFirst();

export const getOwnReceipts = (
	database: Database,
	ownerAccountId: AccountsId
) =>
	database.selectFrom("receipts").where("ownerAccountId", "=", ownerAccountId);

export const getForeignReceipts = (
	database: Database,
	ownerAccountId: AccountsId
) =>
	database
		.selectFrom("users")
		.where("users.connectedAccountId", "=", ownerAccountId)
		.where("users.ownerAccountId", "<>", ownerAccountId)
		.innerJoin("receiptParticipants", (jb) =>
			jb.onRef("receiptParticipants.userId", "=", "users.id")
		)
		.innerJoin("receipts", (jb) =>
			jb.onRef("receipts.id", "=", "receiptParticipants.receiptId")
		);
