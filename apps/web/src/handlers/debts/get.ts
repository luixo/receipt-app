import { TRPCError } from "@trpc/server";
import { pick } from "remeda";
import { z } from "zod";

import type { DebtId } from "~db/ids";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import { authProcedure } from "~web/handlers/trpc";
import { debtIdSchema } from "~web/handlers/validation";

const fetchDebts = async ({ database }: AuthorizedContext, ids: DebtId[]) =>
	database
		.selectFrom("debts")
		.where("debts.id", "in", ids)
		.leftJoin("peers", (qb) => qb.onRef("debts.peerId", "=", "peers.id"))
		.select([
			"debts.id",
			"debts.ownerUserId",
			"debts.amount",
			"debts.currencyCode",
			"debts.note",
			"debts.timestamp",
			"debts.peerId",
			"debts.updatedAt",
			"debts.receiptId",
			"peers.connectedUserId",
		])
		.execute();

const mapDebt = (debt: Awaited<ReturnType<typeof fetchDebts>>[number]) => ({
	id: debt.id,
	peerId: debt.peerId,
	receiptId: debt.receiptId || undefined,
	note: debt.note,
	amount: Number(debt.amount),
	currencyCode: debt.currencyCode,
	timestamp: debt.timestamp,
	updatedAt: debt.updatedAt,
});

const queueDebt = queueCallFactory<
	AuthorizedContext,
	{ id: DebtId },
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
			({ ownerUserId }) => ownerUserId === ctx.auth.userId,
		);
		const theirDebt = localDebts.find(
			({ ownerUserId }) => ownerUserId !== ctx.auth.userId,
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
		if (theirDebt && theirDebt.connectedUserId !== ctx.auth.userId) {
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
	.meta({
		title: "Get debt",
		description:
			"Returns a debt by id owned by the current  user, including the counterparty's mirrored debt if one exists.",
	})
	.input(z.strictObject({ id: debtIdSchema }))
	.query(queueDebt);
