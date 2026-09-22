import { TRPCError } from "@trpc/server";
import { isNonNullish, unique } from "remeda";
import { z } from "zod";

import { debtAmountSchema, debtNoteSchema } from "~app/utils/validation";
import type { DebtId } from "~db/ids";
import { temporalSchemas } from "~utils/temporal";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import { authProcedure } from "~web/handlers/trpc";
import {
	currencyCodeSchema,
	peerIdSchema,
	receiptIdSchema,
} from "~web/handlers/validation";

import { upsertAutoAcceptedDebts } from "./utils";

const addDebtSchema = z.strictObject({
	note: debtNoteSchema,
	currencyCode: currencyCodeSchema,
	peerId: peerIdSchema,
	amount: debtAmountSchema,
	timestamp: temporalSchemas.plainDate.optional(),
	receiptId: receiptIdSchema.optional(),
});

const getData = async (
	ctx: AuthorizedContext,
	debts: readonly z.infer<typeof addDebtSchema>[],
) => {
	const peerIds = unique(debts.map(({ peerId }) => peerId));
	const receiptPeerTuples = unique(
		debts
			.map(({ receiptId, peerId }) =>
				receiptId ? { receiptId, peerId } : undefined,
			)
			.filter(isNonNullish),
	);
	const [peers, debtReceiptTuples] = await Promise.all([
		ctx.database
			.selectFrom("peers")
			.leftJoin("accountSettings", (qb) =>
				qb.onRef("peers.connectedAccountId", "=", "accountSettings.accountId"),
			)
			.leftJoin("peers as peersTheir", (qb) =>
				qb
					.onRef("peersTheir.ownerAccountId", "=", "peers.connectedAccountId")
					.on("peersTheir.connectedAccountId", "=", ctx.auth.accountId),
			)
			.select([
				"peers.id as peerId",
				"peers.ownerAccountId as selfAccountId",
				"peers.connectedAccountId as foreignAccountId",
				"peersTheir.id as theirPeerId",
				"accountSettings.manualAcceptDebts",
			])
			.where("peers.id", "in", peerIds)
			.execute(),
		receiptPeerTuples.length === 0
			? []
			: ctx.database
					.selectFrom("debts")
					.where((eb) =>
						eb.or(
							receiptPeerTuples.map(({ receiptId, peerId }) =>
								eb.and({
									"debts.receiptId": receiptId,
									"debts.peerId": peerId,
								}),
							),
						),
					)
					.where("debts.ownerAccountId", "=", ctx.auth.accountId)
					.select(["debts.peerId", "debts.receiptId"])
					.execute(),
	]);
	return { peers, debtReceiptTuples };
};

const getDebtPeerReceiptTupleId = (debt: z.infer<typeof addDebtSchema>) =>
	`${debt.peerId}/${debt.receiptId}`;

const getMatchedPeer = (
	debt: z.infer<typeof addDebtSchema>,
	peers: Awaited<ReturnType<typeof getData>>["peers"],
) => {
	const matchedPeer = peers.find((peer) => peer.peerId === debt.peerId);
	/* c8 ignore start */
	if (!matchedPeer) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: `Expected to have a matched peer id "${debt.peerId}".`,
		});
	}
	/* c8 ignore stop */
	return matchedPeer;
};

const addAutoAcceptingDebts = async (
	ctx: AuthorizedContext,
	peers: Awaited<ReturnType<typeof getData>>["peers"],
	debts: (z.infer<typeof addDebtSchema> & { generatedId: DebtId })[],
) => {
	const { updatedDebts, newDebts } = await upsertAutoAcceptedDebts(
		ctx.database,
		debts
			.map(({ generatedId, ...debt }) => {
				const peer = getMatchedPeer(debt, peers);
				if (
					!peer.foreignAccountId ||
					!peer.theirPeerId ||
					peer.manualAcceptDebts
				) {
					return null;
				}
				return {
					id: generatedId,
					note: debt.note,
					currencyCode: debt.currencyCode,
					timestamp: debt.timestamp || Temporal.Now.plainDateISO(),
					receiptId: debt.receiptId,
					ownerAccountId: peer.foreignAccountId,
					peerId: peer.theirPeerId,
					amount: (-debt.amount).toString(),
					isNew: true,
				};
			})
			.filter(isNonNullish),
	);
	const acceptingReversePeerIds = unique([
		...newDebts.map((debt) => debt.peerId),
		...updatedDebts.map((debt) => debt.peerId),
	]);
	const acceptedPeerIds = acceptingReversePeerIds.map((reversePeerId) => {
		const matchedPeer = peers.find(
			(peer) => peer.theirPeerId === reversePeerId,
		);
		/* c8 ignore start */
		if (!matchedPeer) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Expected to have a peer for reverse peer id "${reversePeerId}".`,
			});
		}
		/* c8 ignore stop */
		return matchedPeer.peerId;
	});
	return {
		reverseIdMap: debts.reduce<Partial<Record<string, DebtId>>>((acc, debt) => {
			if (!debt.receiptId) {
				return acc;
			}
			const matchedPeer = getMatchedPeer(debt, peers);
			const matchedUpdatedDebt = updatedDebts.find(
				(lookupDebt) =>
					lookupDebt.receiptId === debt.receiptId &&
					lookupDebt.peerId === matchedPeer.theirPeerId,
			);
			if (!matchedUpdatedDebt) {
				return acc;
			}
			return {
				...acc,
				[getDebtPeerReceiptTupleId(debt)]: matchedUpdatedDebt.id,
			};
		}, {}),
		acceptedPeerIds,
	};
};

const addDebts = async (
	ctx: AuthorizedContext,
	debts: (z.infer<typeof addDebtSchema> & { generatedId: DebtId })[],
	reverseIdMap: Awaited<
		ReturnType<typeof addAutoAcceptingDebts>
	>["reverseIdMap"],
) => {
	if (debts.length === 0) {
		return [];
	}
	const values = await ctx.database
		.insertInto("debts")
		.values(
			debts
				.map(({ generatedId, ...debt }) => ({
					id: reverseIdMap[getDebtPeerReceiptTupleId(debt)] || generatedId,
					note: debt.note,
					currencyCode: debt.currencyCode,
					timestamp: debt.timestamp || Temporal.Now.plainDateISO(),
					receiptId: debt.receiptId,
					ownerAccountId: ctx.auth.accountId,
					peerId: debt.peerId,
					amount: debt.amount.toString(),
				}))
				.filter(isNonNullish),
		)
		.returning(["debts.id", "debts.updatedAt"])
		.execute();
	return debts.map(({ generatedId, ...debt }) => {
		const id = reverseIdMap[getDebtPeerReceiptTupleId(debt)] || generatedId;
		// We just added these value, should be returned in `values` variable
		// oxlint-disable-next-line typescript/no-non-null-assertion
		const { updatedAt } = values.find(({ id: lookupId }) => lookupId === id)!;
		return { id, updatedAt };
	});
};

const queueAddDebt = queueCallFactory<
	AuthorizedContext,
	z.infer<typeof addDebtSchema>,
	{
		id: DebtId;
		updatedAt: Temporal.ZonedDateTime;
		// `undefined` signifies that peer is local
		reverseAccepted: boolean | undefined;
	}
>((ctx) => async (inputs) => {
	const { peers, debtReceiptTuples } = await getData(ctx, inputs);
	const debtsOrErrors = inputs.map((debt) => {
		const matchedPeer = peers.find((result) => result.peerId === debt.peerId);
		if (!matchedPeer) {
			return new TRPCError({
				code: "NOT_FOUND",
				message: `Peer "${debt.peerId}" does not exist.`,
			});
		}
		if (matchedPeer.selfAccountId !== ctx.auth.accountId) {
			return new TRPCError({
				code: "FORBIDDEN",
				message: `Peer "${debt.peerId}" is not owned by "${ctx.auth.email}".`,
			});
		}
		if (debt.peerId === matchedPeer.selfAccountId) {
			return new TRPCError({
				code: "FORBIDDEN",
				message: `Cannot add a debt for yourself.`,
			});
		}
		const matchedDebtReceipt = debtReceiptTuples.find(
			({ peerId, receiptId }) =>
				peerId === debt.peerId && receiptId === debt.receiptId,
		);
		if (matchedDebtReceipt) {
			return new TRPCError({
				code: "FORBIDDEN",
				message: `There is already a debt for peer "${matchedDebtReceipt.peerId}" in receipt "${matchedDebtReceipt.receiptId}".`,
			});
		}
		return { ...debt, generatedId: ctx.getUuid() };
	});
	const debts = debtsOrErrors.filter(
		(debtOrError): debtOrError is Exclude<typeof debtOrError, TRPCError> =>
			!(debtOrError instanceof TRPCError),
	);
	const { reverseIdMap, acceptedPeerIds } = await addAutoAcceptingDebts(
		ctx,
		peers,
		debts,
	);
	const localPeerIds = new Set(
		peers
			.filter((peer) => peer.foreignAccountId === null)
			.map((peer) => peer.peerId),
	);
	const addedDebts = await addDebts(ctx, debts, reverseIdMap);
	return debtsOrErrors.map((debtOrError) => {
		if (debtOrError instanceof TRPCError) {
			return debtOrError;
		}
		const id =
			reverseIdMap[getDebtPeerReceiptTupleId(debtOrError)] ||
			debtOrError.generatedId;
		const matchedAddedDebt = addedDebts.find(
			(addedDebt) => addedDebt.id === id,
		);
		/* c8 ignore start */
		if (!matchedAddedDebt) {
			return new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Expected to have matched added debt for id "${id}".`,
			});
		}
		/* c8 ignore stop */
		return {
			id,
			updatedAt: matchedAddedDebt.updatedAt,
			reverseAccepted: localPeerIds.has(debtOrError.peerId)
				? undefined
				: acceptedPeerIds.includes(debtOrError.peerId),
		};
	});
});

export const procedure = authProcedure
	.meta({
		title: "Add debt",
		description:
			"Adds a debt for a given peerId, auto-accepting the mirrored debt on the counterparty's account unless they require manual acceptance.",
	})
	.input(addDebtSchema)
	.mutation(queueAddDebt);
