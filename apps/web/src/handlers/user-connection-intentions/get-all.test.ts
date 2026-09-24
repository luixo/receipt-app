import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertPeer,
	insertUser,
	insertUserWithSession,
} from "~tests/backend/utils/data";
import { expectUnauthorizedError } from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./get-all";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("userConnectionIntentions.getAll", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) => createCaller(context).procedure());
	});

	describe("functionality", () => {
		test("return empty arrays", async ({ ctx }) => {
			const { sessionId } = await insertUserWithSession(ctx);

			const { id: firstUserId } = await insertUser(ctx);
			const { id: secondUserId } = await insertUser(ctx);
			await insertPeer(ctx, firstUserId, {
				connectedUserId: secondUserId,
			});

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure();
			expect(result).toStrictEqual<typeof result>({
				inbound: [],
				outbound: [],
			});
		});

		test("returns  user connection intentions", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: inboundUserId, email: inboundEmail } = await insertUser(ctx);
			const { id: secondInboundUserId, email: secondInboundEmail } =
				await insertUser(ctx);
			const { id: outboundUserId, email: outboundEmail } =
				await insertUser(ctx);
			const { id: secondOutboundUserId, email: secondOutboundEmail } =
				await insertUser(ctx);

			const { id: outboundPeerId, name: outboundPeerName } = await insertPeer(
				ctx,
				userId,
				{ connectedUserId: outboundUserId },
			);
			const { id: secondOutboundPeerId, name: secondOutboundPeerName } =
				await insertPeer(ctx, userId, {
					connectedUserId: secondOutboundUserId,
				});
			await insertPeer(ctx, inboundUserId, {
				connectedUserId: userId,
			});
			await insertPeer(ctx, inboundUserId, {
				connectedUserId: outboundUserId,
			});
			await insertPeer(ctx, secondInboundUserId, {
				connectedUserId: userId,
			});

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure();
			expect({
				inbound: result.inbound.toSorted((a, b) =>
					a.user.id.localeCompare(b.user.id),
				),
				outbound: result.outbound.toSorted((a, b) =>
					a.user.id.localeCompare(b.user.id),
				),
			}).toStrictEqual<typeof result>({
				inbound: [
					{ user: { id: inboundUserId, email: inboundEmail } },
					{
						user: {
							id: secondInboundUserId,
							email: secondInboundEmail,
						},
					},
				].toSorted((a, b) => a.user.id.localeCompare(b.user.id)),
				outbound: [
					{
						user: { id: outboundUserId, email: outboundEmail },
						peer: { id: outboundPeerId, name: outboundPeerName },
					},
					{
						user: {
							id: secondOutboundUserId,
							email: secondOutboundEmail,
						},
						peer: { id: secondOutboundPeerId, name: secondOutboundPeerName },
					},
				].toSorted((a, b) => a.user.id.localeCompare(b.user.id)),
			});
		});
	});
});
