import type { QueryCreator } from "kysely";
import type { z } from "zod";

import type { AccountsId } from "~db/models";
import type { Database, ReceiptsDatabase } from "~db/types";
import type { assignableRoleSchema } from "~web/handlers/validation";
import { roleSchema } from "~web/handlers/validation";

export type Role = z.infer<typeof roleSchema>;
export type AssignableRole = z.infer<typeof assignableRoleSchema>;

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
		.select("receiptParticipants.role")
		.limit(1)
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

export const getOwnReceipts = (
	database: Database | QueryCreator<ReceiptsDatabase>,
	ownerAccountId: AccountsId,
) =>
	database.selectFrom("receipts").where("ownerAccountId", "=", ownerAccountId);

export const getParticipantsReceipts = (
	database: Database | QueryCreator<ReceiptsDatabase>,
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
