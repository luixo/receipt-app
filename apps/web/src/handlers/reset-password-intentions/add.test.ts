import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { createContext } from "~tests/backend/utils/context";
import {
	insertAccountWithSession,
	insertResetPasswordIntention,
} from "~tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";
import { MAX_INTENTIONS_AMOUNT } from "~web/handlers/validation";

import { procedure } from "./add";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("resetPasswordIntentions.add", () => {
	describe("input verification", () => {
		describe("email", () => {
			test("invalid", async ({ ctx }) => {
				const caller = createCaller(createContext(ctx));
				await expectTRPCError(
					() => caller.procedure({ email: "invalid@@mail.org" }),
					"BAD_REQUEST",
					`Zod error\n\nAt "email": Invalid email address`,
				);
			});
		});

		test("email doesn't exist", async ({ ctx }) => {
			const caller = createCaller(createContext(ctx));
			const email = faker.internet.email();
			await expectTRPCError(
				() => caller.procedure({ email }),
				"NOT_FOUND",
				`Account "${email}" does not exist.`,
			);
		});

		test("too many reset intentions", async ({ ctx }) => {
			const caller = createCaller(createContext(ctx));
			const {
				accountId,
				account: { email },
			} = await insertAccountWithSession(ctx);
			await Promise.all(
				new Array(MAX_INTENTIONS_AMOUNT)
					.fill(null)
					.map(() => insertResetPasswordIntention(ctx, accountId)),
			);
			await expectTRPCError(
				() => caller.procedure({ email }),
				"FORBIDDEN",
				`Maximum amount of intentions per day is ${MAX_INTENTIONS_AMOUNT}, please try later.`,
			);
		});
	});

	describe("functionality", () => {
		test("email service is disabled", async ({ ctx }) => {
			ctx.emailOptions.active = false;
			const {
				account: { email },
			} = await insertAccountWithSession(ctx);
			const caller = createCaller(createContext(ctx));

			await expectTRPCError(
				() => caller.procedure({ email }),
				"FORBIDDEN",
				`Currently password reset is not supported.`,
			);
		});

		test("email service is broken", async ({ ctx }) => {
			ctx.emailOptions.broken = true;
			const {
				account: { email },
			} = await insertAccountWithSession(ctx);
			const caller = createCaller(createContext(ctx));

			await expectTRPCError(
				() => caller.procedure({ email }),
				"INTERNAL_SERVER_ERROR",
				"Test context broke email service error",
			);
		});

		test("reset password intention added", async ({ ctx }) => {
			const {
				accountId,
				account: { email },
			} = await insertAccountWithSession(ctx);
			const caller = createCaller(createContext(ctx));

			// Verify we can add an intention even if we already have one
			await insertResetPasswordIntention(ctx, accountId);
			await expectDatabaseDiffSnapshot(ctx, () => caller.procedure({ email }));
			expect(ctx.emailOptions.mock.getMessages()).toHaveLength(1);
			const message = ctx.emailOptions.mock.getMessages()[0]!;
			expect(message).toStrictEqual<typeof message>({
				address: email.toLowerCase(),
				body: message.body,
				subject: "Reset password intention in Receipt App",
			});
			expect(message.body).toMatchSnapshot();
		});
	});
});
