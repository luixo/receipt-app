import type { Selection } from "kysely";
import { sql } from "kysely";

import { getParticipantSums } from "app/utils/receipt-item";
import type { Database, ReceiptsSelectExpression } from "next-app/db";
import type {
	AccountsId,
	DebtsId,
	ReceiptItemsId,
	ReceiptsId,
	UsersId,
} from "next-app/db/models";
import type { ReceiptsDatabase } from "next-app/db/types";
import type { UnauthorizedContext } from "next-app/handlers/context";
import type { Role } from "next-app/handlers/receipts/utils";

export const getReceiptItemById = <
	SE extends ReceiptsSelectExpression<"receiptItems">,
>(
	database: Database,
	id: ReceiptItemsId,
	selectExpression: SE[],
): Promise<Selection<ReceiptsDatabase, "receiptItems", SE> | undefined> =>
	database
		.selectFrom("receiptItems")
		.select(selectExpression)
		.where("id", "=", id)
		.executeTakeFirst();

const getReceiptItems = async (database: Database, receiptId: ReceiptsId) => {
	const items = await database
		.selectFrom("receiptItems")
		.leftJoin("itemParticipants", (jb) =>
			jb.onRef("receiptItems.id", "=", "itemParticipants.itemId"),
		)
		.select([
			"receiptItems.id as itemId",
			"receiptItems.name",
			"receiptItems.price",
			"receiptItems.locked",
			"receiptItems.quantity",
			"itemParticipants.userId",
			"itemParticipants.part",
		])
		.where("receiptItems.receiptId", "=", receiptId)
		.orderBy("receiptItems.id")
		.execute();
	return Object.values(
		items.reduce(
			(acc, { price, quantity, itemId, userId, part, locked, ...rest }) => {
				if (!acc[itemId]) {
					acc[itemId] = {
						id: itemId,
						price: Number(price),
						quantity: Number(quantity),
						parts: [],
						locked: Boolean(locked),
						...rest,
					};
				}
				if (userId) {
					acc[itemId]!.parts.push({
						userId,
						part: Number(part),
					});
				}
				return acc;
			},
			{} as Record<ReceiptItemsId, ReceiptItem>,
		),
	)
		.map(({ parts, ...receiptItem }) => ({
			...receiptItem,
			parts: parts.sort((a, b) => a.userId.localeCompare(b.userId)),
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
};

type RawReceiptItem = {
	itemId: ReceiptItemsId;
	name: string;
	price: string;
	locked: boolean;
	quantity: string;
	userId: UsersId | null;
	part: string | null;
};

type ReceiptItem = Omit<
	RawReceiptItem,
	"price" | "quantity" | "itemId" | "userId" | "part"
> & {
	id: ReceiptItemsId;
	price: number;
	quantity: number;
	parts: {
		userId: UsersId;
		part: number;
	}[];
};

const getReceiptParticipants = async (
	database: Database,
	receiptId: ReceiptsId,
	ownerAccountId: AccountsId,
) => {
	const participants = await database
		.selectFrom("receiptParticipants")
		.where("receiptId", "=", receiptId)
		.innerJoin("users as usersTheir", (jb) =>
			jb.onRef("usersTheir.id", "=", "receiptParticipants.userId"),
		)
		.leftJoin("users as usersMine", (jb) =>
			jb
				.onRef(
					"usersMine.connectedAccountId",
					"=",
					"usersTheir.connectedAccountId",
				)
				.on("usersMine.ownerAccountId", "=", ownerAccountId),
		)
		.leftJoin("accounts", (qb) =>
			qb.onRef("usersMine.connectedAccountId", "=", "accounts.id"),
		)
		.select([
			"userId as remoteUserId",
			"usersMine.publicName",
			"usersMine.name",
			"usersTheir.publicName as theirPublicName",
			"usersTheir.name as theirName",
			"accounts.id as accountId",
			"accounts.email",
			sql`role`.castTo<Role>().as("role"),
			"receiptParticipants.resolved",
			"added",
		])
		.orderBy("userId")
		.execute();
	return participants.map(
		({ name, theirName, theirPublicName, ...participant }) => ({
			...participant,
			name: name ?? theirPublicName ?? theirName,
		}),
	);
};

export const getItemsWithParticipants = async (
	database: Database,
	receiptId: ReceiptsId,
	ownerAccountId: AccountsId,
) =>
	Promise.all([
		getReceiptItems(database, receiptId),
		getReceiptParticipants(database, receiptId, ownerAccountId),
	]);

export const getValidParticipants = async (
	ctx: UnauthorizedContext,
	receiptId: ReceiptsId,
	ownerAccountId: AccountsId,
) => {
	const [receiptItems, receiptParticipants] = await getItemsWithParticipants(
		ctx.database,
		receiptId,
		ownerAccountId,
	);
	return getParticipantSums(receiptId, receiptItems, receiptParticipants)
		.filter(
			(participant) =>
				// user has to participate in a receipt
				participant.sum !== 0 &&
				// .. and has to be someone but yourself
				participant.remoteUserId !== ownerAccountId,
		)
		.map((participant) => ({
			...participant,
			debtId: ctx.getUuid() as DebtsId,
		}));
};
