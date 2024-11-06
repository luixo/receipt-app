import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import { authProcedure } from "~web/handlers/trpc";
import { debtIdSchema } from "~web/handlers/validation";

const acceptIntentionSchema = z.strictObject({
	id: debtIdSchema,
});

type Input = z.infer<typeof acceptIntentionSchema>;

const fetchIntentions = (ctx: AuthorizedContext, inputs: readonly Input[]) =>
	ctx.database
		.selectFrom("debts as theirDebts")
		.where((eb) =>
			eb(
				"theirDebts.id",
				"in",
				inputs.map((input) => input.id),
			).and("theirDebts.ownerAccountId", "<>", ctx.auth.accountId),
		)
		.innerJoin("users", (qb) =>
			qb
				.onRef("users.connectedAccountId", "=", "theirDebts.ownerAccountId")
				.on("users.ownerAccountId", "=", ctx.auth.accountId),
		)
		.leftJoin("debts as selfDebts", (qb) =>
			qb
				.onRef("selfDebts.id", "=", "theirDebts.id")
				.on("selfDebts.ownerAccountId", "=", ctx.auth.accountId),
		)
		.select([
			"theirDebts.id",
			"theirDebts.ownerAccountId",
			"theirDebts.updatedAt",
			"theirDebts.amount",
			"theirDebts.note",
			"theirDebts.timestamp",
			"theirDebts.currencyCode",
			"theirDebts.receiptId",
			"selfDebts.id as selfId",
			"users.id as foreignUserId",
		])
		.execute();

type FetchedIntention = Awaited<ReturnType<typeof fetchIntentions>>[number];

const acceptUpdatedIntentions = async (
	ctx: AuthorizedContext,
	intentions: FetchedIntention[],
) => {
	const updatedIntentions = intentions.filter((intention) => intention.selfId);
	if (updatedIntentions.length === 0) {
		return [];
	}
	return ctx.database.transaction().execute((tx) =>
		Promise.all(
			updatedIntentions.map(async (intentionToUpdate) => {
				const { id, updatedAt } = await tx
					.updateTable("debts")
					.set({
						amount: (Number(intentionToUpdate.amount) * -1).toString(),
						currencyCode: intentionToUpdate.currencyCode,
						timestamp: intentionToUpdate.timestamp,
					})
					.where((eb) =>
						eb.and({
							id: intentionToUpdate.id,
							ownerAccountId: ctx.auth.accountId,
						}),
					)
					.returning(["debts.id", "debts.updatedAt"])
					.executeTakeFirstOrThrow();
				return {
					id,
					updatedAt,
				};
			}),
		),
	);
};

const acceptNewIntentions = async (
	ctx: AuthorizedContext,
	intentions: FetchedIntention[],
) => {
	const createdIntentions = intentions.filter((intention) => !intention.selfId);
	if (createdIntentions.length === 0) {
		return [];
	}
	return ctx.database
		.insertInto("debts")
		.values(
			createdIntentions.map((intention) => ({
				id: intention.id,
				ownerAccountId: ctx.auth.accountId,
				userId: intention.foreignUserId,
				currencyCode: intention.currencyCode,
				amount: (Number(intention.amount) * -1).toString(),
				timestamp: intention.timestamp,
				createdAt: new Date(),
				note: intention.note,
				receiptId: intention.receiptId,
			})),
		)
		.returning(["debts.id", "debts.updatedAt"])
		.execute();
};

const queueAcceptIntention = queueCallFactory<
	AuthorizedContext,
	Input,
	{ updatedAt: Date }
>((ctx) => async (inputs) => {
	const intentions = await fetchIntentions(ctx, inputs);
	const intentionsOrErrors = inputs.map((input) => {
		const matchedIntention = intentions.find(
			(intention) => intention.id === input.id,
		);
		if (!matchedIntention) {
			return new TRPCError({
				code: "NOT_FOUND",
				message: `Intention for debt "${input.id}" is not found.`,
			});
		}
		return matchedIntention;
	});
	const intentionsToAccept = intentionsOrErrors.filter(
		(
			intentionOrError,
		): intentionOrError is Exclude<typeof intentionOrError, TRPCError> =>
			!(intentionOrError instanceof TRPCError),
	);
	const [updatedIntentions, newIntentions] = await Promise.all([
		acceptUpdatedIntentions(ctx, intentionsToAccept),
		acceptNewIntentions(ctx, intentionsToAccept),
	]);
	return intentionsOrErrors.map((intentionOrError) => {
		if (intentionOrError instanceof TRPCError) {
			return intentionOrError;
		}
		const matchedNewIntention = newIntentions.find(
			(intention) => intention.id === intentionOrError.id,
		);
		const matchedUpdatedIntention = updatedIntentions.find(
			(intention) => intention.id === intentionOrError.id,
		);
		const anyIntention = matchedNewIntention || matchedUpdatedIntention;
		/* c8 ignore start */
		if (!anyIntention) {
			return new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Expected to have an accepted intention id "${intentionOrError.id}".`,
			});
		}
		/* c8 ignore stop */
		return { updatedAt: anyIntention.updatedAt };
	});
});

export const procedure = authProcedure
	.input(acceptIntentionSchema)
	.mutation(queueAcceptIntention);
