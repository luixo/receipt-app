import { Selection } from "kysely";
import { z } from "zod";

import { ReceiptsSelectExpression, ReceiptsDatabase, Database } from "../../db";
import { ReceiptsId } from "../../db/models";
import { role } from "../zod";

type Role = z.infer<typeof role>;

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
	const parsed = role.safeParse(participant.role);
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
