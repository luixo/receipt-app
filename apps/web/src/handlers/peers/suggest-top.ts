import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { limitSchema } from "~app/utils/validation";
import type { PeerId } from "~db/ids";
import { getAccessRole } from "~web/handlers/receipts/utils";
import { authProcedure } from "~web/handlers/trpc";
import { peerIdSchema, receiptIdSchema } from "~web/handlers/validation";

export const procedure = authProcedure
	.meta({
		title: "Suggest top peers",
		description:
			"Returns the current account's peers most recently active in debts or a given receipt, for quick selection.",
	})
	.input(
		z.strictObject({
			limit: limitSchema,
			filterIds: z.array(peerIdSchema).optional(),
			options: z
				.discriminatedUnion("type", [
					z.strictObject({
						type: z.literal("not-connected"),
					}),
					z.strictObject({
						type: z.literal("not-connected-receipt"),
						receiptId: receiptIdSchema,
					}),
				])
				.optional(),
		}),
	)
	.output(z.strictObject({ items: z.array(peerIdSchema) }))
	.query(async ({ input, ctx }) => {
		const { database } = ctx;
		const filterIds = [
			...(input.filterIds || []),
			ctx.auth.accountId as PeerId,
		];
		const monthAgo = Temporal.Now.plainDateISO().subtract({ months: 1 });
		const options = input.options || { type: "all" };
		if (options.type === "not-connected-receipt") {
			const { receiptId } = options;
			const receipt = await database
				.selectFrom("receipts")
				.select(["ownerAccountId", "id"])
				.where("id", "=", receiptId)
				.limit(1)
				.executeTakeFirst();
			if (!receipt) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: `Receipt "${receiptId}" does not exist.`,
				});
			}
			const accessRole = await getAccessRole(
				database,
				receipt,
				ctx.auth.accountId,
			);
			if (!accessRole) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: `Not enough rights to view receipt "${receiptId}".`,
				});
			}
			const peers = await database
				.with("orderedPeers", (qc) =>
					qc
						.selectFrom("peers")
						.where((eb) =>
							eb("peers.ownerAccountId", "=", ctx.auth.accountId).and(
								"peers.id",
								"not in",
								(ebb) =>
									ebb
										.selectFrom("receiptParticipants")
										.innerJoin("peers", (jb) =>
											jb.onRef("peers.id", "=", "receiptParticipants.peerId"),
										)
										.where("receiptParticipants.receiptId", "=", receiptId)
										.select("peers.id"),
							),
						)
						.$if(filterIds.length !== 0, (qb) =>
							qb.where("peers.id", "not in", filterIds),
						)
						.leftJoin("receiptParticipants", (qb) =>
							qb.onRef("receiptParticipants.peerId", "=", "peers.id"),
						)
						.leftJoin("receipts", (qb) =>
							qb
								.onRef("receiptParticipants.receiptId", "=", "receipts.id")
								.on("receipts.issued", ">", monthAgo),
						)
						.distinctOn(["peers.id"])
						.select([
							"peers.id",
							database.fn.count<number>("receipts.id").as("latestCount"),
						])
						.groupBy("peers.id")
						.orderBy("peers.id"),
				)
				.selectFrom("orderedPeers")
				.select(["id"])
				.orderBy("latestCount", "desc")
				.limit(input.limit)
				.execute();

			return {
				items: peers.map(({ id }) => id),
			};
		}
		if (options.type === "not-connected") {
			const peers = await database
				.selectFrom("peers")
				.where((eb) =>
					eb.and([
						eb("peers.ownerAccountId", "=", ctx.auth.accountId),
						eb("peers.connectedAccountId", "is", null),
					]),
				)
				.leftJoin("debts", (qb) =>
					qb
						.onRef("debts.peerId", "=", "peers.id")
						.on("debts.timestamp", ">", monthAgo),
				)
				.$if(filterIds.length !== 0, (qb) =>
					qb.where("peers.id", "not in", filterIds),
				)
				.select([
					"peers.id",
					database.fn.count<number>("debts.id").as("latestCount"),
				])
				.groupBy(["peers.id"])
				.orderBy("latestCount", "desc")
				.orderBy("peers.id")
				.limit(input.limit)
				.execute();
			return { items: peers.map(({ id }) => id) };
		}
		const peers = await database
			.selectFrom("peers")
			.where((eb) =>
				eb("peers.ownerAccountId", "=", ctx.auth.accountId).and(
					"peers.id",
					"<>",
					ctx.auth.accountId as PeerId,
				),
			)
			.leftJoin("debts", (qb) =>
				qb
					.onRef("peers.id", "=", "debts.peerId")
					.on("debts.timestamp", ">", monthAgo),
			)
			.$if(filterIds.length !== 0, (qb) =>
				qb.where("peers.id", "not in", filterIds),
			)
			.select([
				"peers.id",
				database.fn.count<number>("debts.id").as("latestCount"),
			])
			.groupBy("peers.id")
			.orderBy("latestCount", "desc")
			.orderBy("peers.id")
			.limit(input.limit)
			.execute();

		return { items: peers.map(({ id }) => id) };
	});
