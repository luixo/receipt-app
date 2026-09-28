import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { createContext } from "~tests/backend/utils/context";
import {
	insertResetPasswordIntention,
	insertUser,
	insertUserWithSession,
} from "~tests/backend/utils/data";
import { expectTRPCError } from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./get";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("resetPasswordIntentions.get", () => {
	describe("input verification", () => {
		describe("token", () => {
			test("invalid", async ({ ctx }) => {
				const caller = createCaller(createContext(ctx));
				await expectTRPCError(
					() => caller.procedure({ token: "" }),
					"BAD_REQUEST",
					`Zod error\n\nAt "token": Too small: expected string to have >=1 characters`,
				);
			});
		});

		test("no intention token exists", async ({ ctx }) => {
			const caller = createCaller(createContext(ctx));
			const intentionToken = faker.string.uuid();
			await expectTRPCError(
				() => caller.procedure({ token: intentionToken }),
				"NOT_FOUND",
				`Reset password intention "${intentionToken}" does not exist or expired.`,
			);
		});

		test("intention token is expired", async ({ ctx }) => {
			const caller = createCaller(createContext(ctx));
			const { id: userId } = await insertUser(ctx);
			const { token } = await insertResetPasswordIntention(ctx, userId, {
				expiresTimestamp: Temporal.Now.zonedDateTimeISO().subtract({
					minutes: 1,
				}),
			});
			await expectTRPCError(
				() => caller.procedure({ token }),
				"NOT_FOUND",
				`Reset password intention "${token}" does not exist or expired.`,
			);
		});
	});

	describe("functionality", () => {
		test("email is returned", async ({ ctx }) => {
			const {
				userId,
				user: { email },
			} = await insertUserWithSession(ctx);
			const { token } = await insertResetPasswordIntention(ctx, userId);
			const caller = createCaller(createContext(ctx));
			const result = await caller.procedure({ token });
			expect(result).toStrictEqual<typeof result>({ email });
		});
	});
});
