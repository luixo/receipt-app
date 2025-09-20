import { TRPCError } from "@trpc/server";
import { pick } from "remeda";
import { z } from "zod";

import type { DebtsId } from "~db/models";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import { authProcedure } from "~web/handlers/trpc";
import { debtIdSchema } from "~web/handlers/validation";

const fetchDebts = async ({ database }: AuthorizedContext, ids: DebtsId[]) =>
	database
		.selectFrom("debts")
		.where("debts.id", "in", ids)
		.leftJoin("users", (qb) => qb.onRef("debts.userId", "=", "users.id"))
		.select([
			"debts.id",
			"debts.ownerAccountId",
			"debts.amount",
			"debts.currencyCode",
			"debts.note",
			"debts.timestamp",
			"debts.userId",
			"debts.updatedAt",
			"debts.receiptId",
			"users.connectedAccountId",
		])
		.execute();

const mapDebt = (debt: Awaited<ReturnType<typeof fetchDebts>>[number]) => ({
	id: debt.id,
	userId: debt.userId,
	receiptId: debt.receiptId || undefined,
	note: debt.note,
	amount: Number(debt.amount),
	currencyCode: debt.currencyCode,
	timestamp: debt.timestamp,
	updatedAt: debt.updatedAt,
});

const queueDebt = queueCallFactory<
	AuthorizedContext,
	{ id: DebtsId },
	ReturnType<typeof mapDebt> & {
		their?: Pick<
			ReturnType<typeof mapDebt>,
			"amount" | "timestamp" | "currencyCode" | "updatedAt"
		>;
	}
>((ctx) => async (inputs) => {
	const debts = await fetchDebts(
		ctx,
		inputs.map(({ id }) => id),
	);
	return inputs.map((input) => {
		const localDebts = debts.filter(({ id }) => id === input.id);
		const ourDebt = localDebts.find(
			({ ownerAccountId }) => ownerAccountId === ctx.auth.accountId,
		);
		const theirDebt = localDebts.find(
			({ ownerAccountId }) => ownerAccountId !== ctx.auth.accountId,
		);
		if (!ourDebt) {
			if (!theirDebt) {
				return new TRPCError({
					code: "NOT_FOUND",
					message: `Debt "${input.id}" does not exist.`,
				});
			}
			return new TRPCError({
				code: "FORBIDDEN",
				message: `You don't have access to debt "${input.id}".`,
			});
		}
		/* c8 ignore start */
		if (theirDebt && theirDebt.connectedAccountId !== ctx.auth.accountId) {
			return new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Foreign debt "${input.id}" is not connected to ours.`,
			});
		}
		/* c8 ignore stop */
		const mappedTheirDebt = theirDebt
			? pick(mapDebt(theirDebt), [
					"amount",
					"timestamp",
					"currencyCode",
					"updatedAt",
				])
			: undefined;
		return {
			...mapDebt(ourDebt),
			their: mappedTheirDebt
				? { ...mappedTheirDebt, amount: -mappedTheirDebt.amount }
				: undefined,
		};
	});
});

export const procedure = authProcedure
	.input(z.strictObject({ id: debtIdSchema }))
	.query(queueDebt);
