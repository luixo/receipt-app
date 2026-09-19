import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
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
			const { id: secondAccountId } = await insertAccount(ctx);
			await insertUser(ctx, firstAccountId, {
				connectedAccountId: secondAccountId,
			});

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure();
			expect(result).toStrictEqual<typeof result>({
				inbound: [],
				outbound: [],
			});
		});

		test("returns account connection intentions", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: inboundAccountId, email: inboundEmail } =
				await insertAccount(ctx);
			const { id: secondInboundAccountId, email: secondInboundEmail } =
				await insertAccount(ctx);
			const { id: outboundAccountId, email: outboundEmail } =
				await insertAccount(ctx);
			const { id: secondOutboundAccountId, email: secondOutboundEmail } =
				await insertAccount(ctx);

			const { id: outboundUserId, name: outboundUserName } = await insertUser(
				ctx,
				accountId,
				{ connectedAccountId: outboundAccountId },
			);
			const { id: secondOutboundUserId, name: secondOutboundUserName } =
				await insertUser(ctx, accountId, {
					connectedAccountId: secondOutboundAccountId,
				});
			await insertUser(ctx, inboundAccountId, {
				connectedAccountId: accountId,
			});
			await insertUser(ctx, inboundAccountId, {
				connectedAccountId: outboundAccountId,
			});
			await insertUser(ctx, secondInboundAccountId, {
				connectedAccountId: accountId,
			});

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure();
			expect({
				inbound: result.inbound.toSorted((a, b) =>
					a.account.id.localeCompare(b.account.id),
				),
				outbound: result.outbound.toSorted((a, b) =>
					a.account.id.localeCompare(b.account.id),
				),
			}).toStrictEqual<typeof result>({
				inbound: [
					{ account: { id: inboundAccountId, email: inboundEmail } },
					{
						account: {
							id: secondInboundAccountId,
							email: secondInboundEmail,
						},
					},
				].toSorted((a, b) => a.account.id.localeCompare(b.account.id)),
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
				].toSorted((a, b) => a.account.id.localeCompare(b.account.id)),
			});
		});
	});
});
