import { faker } from "@faker-js/faker";
import assert from "node:assert";
import { describe, expect } from "vitest";

import { t } from "next-app/handlers/trpc";
import { createContext } from "next-tests/utils/context";
import { insertAccountWithSession } from "next-tests/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
} from "next-tests/utils/expect";
import { test } from "next-tests/utils/test";

import { procedure } from "./confirm-email";

const router = t.router({ procedure });

describe("auth.confirmEmail", () => {
	describe("input verification", () => {
		describe("token", () => {
			test("invalid", async ({ ctx }) => {
				const caller = router.createCaller(createContext(ctx));
				await expectTRPCError(
					() => caller.procedure({ token: "invalid-uuid" }),
					"BAD_REQUEST",
					`Zod error\n\nAt "token": Invalid uuid`,
				);
			});
		});

		test("no confirmation token exists", async ({ ctx }) => {
			const caller = router.createCaller(createContext(ctx));
			const confirmationToken = faker.string.uuid();
			await insertAccountWithSession(ctx);
			await expectTRPCError(
				() => caller.procedure({ token: confirmationToken }),
				"NOT_FOUND",
				`There is no account with confirmation token ${confirmationToken}`,
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
			const context = createContext(ctx);
			const caller = router.createCaller(context);
			assert(
				confirmationToken,
				"Confirmation token should exist on creation of test account",
			);
			await expectDatabaseDiffSnapshot(ctx, async () => {
				const result = await caller.procedure({
					token: confirmationToken,
				});
				expect(result).toEqual<typeof result>({ email });
			});
		});
	});
});
