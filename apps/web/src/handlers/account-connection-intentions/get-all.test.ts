import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountConnectionIntention,
	insertAccountWithSession,
	insertUser,
} from "~tests/backend/utils/data";
import { expectUnauthorizedError } from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./get-all";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("accountConnectionIntentions.getAll", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) => createCaller(context).procedure());
	});

	describe("functionality", () => {
		test("return empty arrays", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);

			const { id: firstAccountId } = await insertAccount(ctx);
			const { id: firstToSecondUserId } = await insertUser(ctx, firstAccountId);

			const { id: secondAccountId } = await insertAccount(ctx);

			// Verify other account connection intentions don't affect error
			await insertAccountConnectionIntention(
				ctx,
				firstAccountId,
				secondAccountId,
				firstToSecondUserId,
			);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await caller.procedure();
			expect(result).toStrictEqual<typeof result>({
				inbound: [],
				outbound: [],
			});
		});

		test("returns account connection intentions", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: outboundUserId, name: outboundUserName } = await insertUser(
				ctx,
				accountId,
			);
			const { id: secondOutboundUserId, name: secondOutboundUserName } =
				await insertUser(ctx, accountId);

			const { id: inboundAccountId, email: inboundEmail } =
				await insertAccount(ctx);
			const { id: inboundUserId } = await insertUser(ctx, inboundAccountId);
			const { id: inboundToOutboundUserId } = await insertUser(
				ctx,
				inboundAccountId,
			);

			const { id: secondInboundAccountId, email: secondInboundEmail } =
				await insertAccount(ctx);
			const { id: secondInboundUserId } = await insertUser(
				ctx,
				secondInboundAccountId,
			);

			const { id: outboundAccountId, email: outboundEmail } =
				await insertAccount(ctx);
			const { id: secondOutboundAccountId, email: secondOutboundEmail } =
				await insertAccount(ctx);

			await insertAccountConnectionIntention(
				ctx,
				accountId,
				outboundAccountId,
				outboundUserId,
			);
			await insertAccountConnectionIntention(
				ctx,
				accountId,
				secondOutboundAccountId,
				secondOutboundUserId,
			);
			await insertAccountConnectionIntention(
				ctx,
				inboundAccountId,
				accountId,
				inboundUserId,
			);
			await insertAccountConnectionIntention(
				ctx,
				secondInboundAccountId,
				accountId,
				secondInboundUserId,
			);

			// Verify other account connection intentions don't affect error
			await insertAccountConnectionIntention(
				ctx,
				inboundAccountId,
				outboundAccountId,
				inboundToOutboundUserId,
			);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await caller.procedure();
			expect(result).toStrictEqual<typeof result>({
				inbound: [
					{ account: { id: inboundAccountId, email: inboundEmail } },
					{
						account: {
							id: secondInboundAccountId,
							email: secondInboundEmail,
						},
					},
				].sort((a, b) => b.account.id.localeCompare(a.account.id)),
				outbound: [
					{
						account: { id: outboundAccountId, email: outboundEmail },
						user: { id: outboundUserId, name: outboundUserName },
					},
					{
						account: {
							id: secondOutboundAccountId,
							email: secondOutboundEmail,
						},
						user: { id: secondOutboundUserId, name: secondOutboundUserName },
					},
				].sort((a, b) => b.account.id.localeCompare(a.account.id)),
			});
		});
	});
});
