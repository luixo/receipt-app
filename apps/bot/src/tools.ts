import { toolDefinition } from "@tanstack/ai";
import { serialize } from "cookie";
import { z } from "zod";

import { AUTH_COOKIE } from "~app/utils/auth";
import type { SessionId } from "~db/ids";
import { getServerTrpcClient } from "~web/utils/trpc";

import { env } from "./env";

type ToolContext = { sessionId: SessionId };

const clientFor = (sessionId: SessionId) =>
	getServerTrpcClient({
		url: env.WEB_BASE_URL,
		source: "bot",
		headers: { Cookie: serialize(AUTH_COOKIE, sessionId) },
	});

export const getUser = toolDefinition({
	name: "get_user",
	description: "Get the current user's profile and self-peer name.",
}).server<ToolContext>((_, { context }) =>
	clientFor(context.sessionId).user.get.query(),
);

export const getAllDebts = toolDefinition({
	name: "get_all_debts",
	description: "Get the current user's total debt amounts per currency.",
}).server<ToolContext>((_, { context }) =>
	clientFor(context.sessionId).debts.getAll.query(),
);

export const getPeerDebts = toolDefinition({
	name: "get_peer_debts",
	description: "Get debt totals per currency for one of the user's peers.",
	inputSchema: z.strictObject({ peerId: z.uuid() }),
}).server<ToolContext>(({ peerId }, { context }) =>
	clientFor(context.sessionId).debts.getAllPeer.query({ peerId }),
);

export const listPeers = toolDefinition({
	name: "list_peers",
	description:
		"List the user's peer IDs in pages. Use get_peer for their names.",
	inputSchema: z.strictObject({ cursor: z.number().int().min(0) }),
}).server<ToolContext>(({ cursor }, { context }) =>
	clientFor(context.sessionId).peers.getPaged.query({ cursor, limit: 50 }),
);

export const getPeer = toolDefinition({
	name: "get_peer",
	description: "Get a peer's name and details by ID.",
	inputSchema: z.strictObject({ id: z.uuid() }),
}).server<ToolContext>(({ id }, { context }) =>
	clientFor(context.sessionId).peers.get.query({ id }),
);

export const listReceipts = toolDefinition({
	name: "list_receipts",
	description:
		"List the user's receipts in pages, optionally searching by name or item.",
	inputSchema: z.strictObject({
		cursor: z.number().int().min(0),
		query: z.string().optional(),
	}),
}).server<ToolContext>(({ cursor, query }, { context }) =>
	clientFor(context.sessionId).receipts.getPaged.query({
		cursor,
		limit: 50,
		orderBy: "date-desc",
		...(query ? { filters: { query } } : {}),
	}),
);

export const getReceipt = toolDefinition({
	name: "get_receipt",
	description: "Get a receipt with its items, participants and debts by ID.",
	inputSchema: z.strictObject({ id: z.uuid() }),
}).server<ToolContext>(({ id }, { context }) =>
	clientFor(context.sessionId).receipts.get.query({ id }),
);

export const tools = [
	getUser,
	getAllDebts,
	getPeerDebts,
	listPeers,
	getPeer,
	listReceipts,
	getReceipt,
];
