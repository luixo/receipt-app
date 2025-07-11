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

import { procedure } from "./void-account";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("auth.voidAccount", () => {
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
			// Verify that not every not verified account counts
			await insertAccountWithSession(ctx);
			await insertAccountWithSession(ctx, {
				account: { confirmation: {} },
			});
			await expectTRPCError(
				() => caller.procedure({ token: confirmationToken }),
				"NOT_FOUND",
				`There is no account with confirmation token "${confirmationToken}".`,
			);
		});
	});

	describe("functionality", () => {
		test("account voided", async ({ ctx }) => {
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
		});

		test.todo("verify account users are removed");
		test.todo("verify account debts are removed");
		test.todo("verify account receipts are removed");
		test.todo("verify account connection intentions are removed");
		test.todo("verify account settings are removed");
		test.todo("verify account reset password intentions are removed");
	});
});
