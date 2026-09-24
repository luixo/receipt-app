import type { QueryCreator } from "kysely";
import type { z } from "zod";

import type { Database } from "~db/database";
import type { UserId } from "~db/ids";
import type { DB } from "~db/types.gen";
import type { assignableRoleSchema } from "~web/handlers/validation";
import { roleSchema } from "~web/handlers/validation";

export type Role = z.infer<typeof roleSchema>;
export type AssignableRole = z.infer<typeof assignableRoleSchema>;

export const getAccessRole = async (
	database: Database,
	receipt: { ownerUserId: string; id: string },
	userId: string,
): Promise<Role | undefined> => {
	if (receipt.ownerUserId === userId) {
		return "owner";
	}
	const participant = await database
		.selectFrom("receiptParticipants")
		.innerJoin("peers", (jb) =>
			jb.onRef("peers.id", "=", "receiptParticipants.peerId"),
		)
		.innerJoin("users", (jb) =>
			jb.onRef("users.id", "=", "peers.connectedUserId"),
		)
		.innerJoin("peers as reciprocalPeers", (jb) =>
			jb
				.onRef("reciprocalPeers.ownerUserId", "=", "peers.connectedUserId")
				.onRef("reciprocalPeers.connectedUserId", "=", "peers.ownerUserId"),
		)
		.where((eb) =>
			eb.and({
				"users.id": userId,
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
	database: Database | QueryCreator<DB>,
	ownerUserId: UserId,
) => database.selectFrom("receipts").where("ownerUserId", "=", ownerUserId);

export const getParticipantsReceipts = (
	database: Database | QueryCreator<DB>,
	ownerUserId: UserId,
) =>
	database
		.selectFrom("peers")
		.where((eb) =>
			eb("peers.connectedUserId", "=", ownerUserId).and(
				"peers.ownerUserId",
				"<>",
				ownerUserId,
			),
		)
		.innerJoin("receiptParticipants", (jb) =>
			jb.onRef("receiptParticipants.peerId", "=", "peers.id"),
		)
		.innerJoin("peers as reciprocalPeers", (jb) =>
			jb
				.onRef("reciprocalPeers.ownerUserId", "=", "peers.connectedUserId")
				.onRef("reciprocalPeers.connectedUserId", "=", "peers.ownerUserId"),
		)
		.innerJoin("receipts", (jb) =>
			jb.onRef("receipts.id", "=", "receiptParticipants.receiptId"),
		);
