import { faker } from "@faker-js/faker";
import assert from "node:assert";
import { describe, expect } from "vitest";

import { createContext } from "~tests/backend/utils/context";
import { insertAccountWithSession } from "~tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";
import { getResHeaders } from "~web/utils/headers";

import { procedure } from "./confirm-email";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("auth.confirmEmail", () => {
	describe("input verification", () => {
		describe("token", () => {
			test("invalid", async ({ ctx }) => {
				const caller = createCaller(await createContext(ctx));
				await expectTRPCError(
					() => caller.procedure({ token: "invalid-uuid" }),
					"BAD_REQUEST",
					`Zod error\n\nAt "token": Invalid UUID`,
				);
			});
		});

		test("no confirmation token exists", async ({ ctx }) => {
			const caller = createCaller(await createContext(ctx));
			const confirmationToken = faker.string.uuid();
			await insertAccountWithSession(ctx);
			await expectTRPCError(
				() => caller.procedure({ token: confirmationToken }),
				"NOT_FOUND",
				`There is no account with confirmation token "${confirmationToken}".`,
			);
		});
	});

	describe("functionality", () => {
		test("account confirmed", async ({ ctx }) => {
			const {
				account: { confirmationToken, email },
			} = await insertAccountWithSession(ctx, {
				account: { confirmation: {} },
			});
			// Verifying other accounts (both confirmed and not) are not affected
			await insertAccountWithSession(ctx);
			await insertAccountWithSession(ctx, {
				account: { confirmation: {} },
			});
			const context = await createContext(ctx);
			const caller = createCaller(context);
			assert(
				confirmationToken,
				"Confirmation token should exist on creation of test account",
			);
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ token: confirmationToken }),
			);
			expect(result).toEqual<typeof result>({ email });
			const responseHeaders = getResHeaders(context);
			const setCookieTuple = responseHeaders.find(
				([key]) => key === "set-cookie",
			);
			assert(
				setCookieTuple,
				"Header 'set-cookie' has to be set in the response",
			);
			const tokenMatch = /authToken=([^;]+)/.exec(setCookieTuple[1].toString());
			assert(tokenMatch, "Cookie 'authToken' should be present");
			const token = tokenMatch[1];
			expect(responseHeaders).toStrictEqual<typeof responseHeaders>([
				[
					"set-cookie",
					`authToken=${token}; Path=/; Expires=Fri, 31 Jan 2020 00:00:00 GMT; HttpOnly; SameSite=Strict`,
				],
			]);
		});
	});
});
