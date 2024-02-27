import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getAccessRole } from "~web/handlers/receipts/utils";
import { authProcedure } from "~web/handlers/trpc";
import { receiptItemIdSchema, userIdSchema } from "~web/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			itemId: receiptItemIdSchema,
			userIds: z.array(userIdSchema).nonempty(),
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const receipt = await database
			.selectFrom("receiptItems")
			.where("receiptItems.id", "=", input.itemId)
			.innerJoin("receipts", (qb) =>
				qb.onRef("receipts.id", "=", "receiptItems.receiptId"),
			)
			.innerJoin("accounts", (qb) =>
				qb.onRef("accounts.id", "=", "receipts.ownerAccountId"),
			)
			.select([
				"receipts.id",
				"receipts.ownerAccountId",
				"receipts.lockedTimestamp",
			])
			.executeTakeFirst();
		if (!receipt) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Receipt item "${input.itemId}" does not exist.`,
			});
		}
		if (receipt.lockedTimestamp) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Receipt "${receipt.id}" cannot be updated while locked.`,
			});
		}
		const accessRole = await getAccessRole(
			database,
			receipt,
			ctx.auth.accountId,
		);
		if (accessRole !== "owner" && accessRole !== "editor") {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Not enough rights to add item to receipt "${receipt.id}".`,
			});
		}
		const receiptParticipants = await database
			.selectFrom("receiptParticipants")
			.where((eb) =>
				eb("receiptId", "=", receipt.id).and("userId", "in", input.userIds),
			)
			.select(["userId"])
			.execute();
		if (receiptParticipants.length !== input.userIds.length) {
			const participatingUserIds = receiptParticipants.map(
				({ userId }) => userId,
			);
			const notParticipatingUsers = input.userIds.filter(
				(id) => !participatingUserIds.includes(id),
			);
			throw new TRPCError({
				code: "PRECONDITION_FAILED",
				message: `${
					notParticipatingUsers.length === 1 ? "User" : "Users"
				} ${notParticipatingUsers.map((id) => `"${id}"`).join(", ")} ${
					notParticipatingUsers.length === 1 ? "doesn't" : "don't"
				} participate in receipt "${receipt.id}".`,
			});
		}
		const itemParts = await database
			.selectFrom("itemParticipants")
			.where((eb) =>
				eb("itemId", "=", input.itemId).and("userId", "in", input.userIds),
			)
			.select(["part", "userId"])
			.execute();
		if (itemParts.length !== 0) {
			const userWithParts = itemParts.map(({ userId }) => userId);
			throw new TRPCError({
				code: "CONFLICT",
				message: `${
					userWithParts.length === 1 ? "User" : "Users"
				} ${userWithParts.map((id) => `"${id}"`).join(", ")} already ${
					userWithParts.length === 1 ? "has" : "have"
				} a part in item "${input.itemId}".`,
			});
		}
		await database
			.insertInto("itemParticipants")
			.values(
				input.userIds.map((userId) => ({
					userId,
					itemId: input.itemId,
					part: "1",
				})),
			)
			.execute();
	});
