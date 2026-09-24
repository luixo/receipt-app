import { faker } from "@faker-js/faker";
import { describe } from "vitest";

import {
	MAX_USERNAME_LENGTH,
	MIN_USERNAME_LENGTH,
} from "~app/utils/validation";
import { createAuthContext } from "~tests/backend/utils/context";
import { insertUserWithSession } from "~tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./change-name";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("user.changeName", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({ name: "" }),
		);

		describe("peer name", () => {
			test("minimal length", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							name: "a".repeat(MIN_USERNAME_LENGTH - 1),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "name": Minimal length for peer name is ${MIN_USERNAME_LENGTH}`,
				);
			});

			test("maximum length", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							name: "a".repeat(MAX_USERNAME_LENGTH + 1),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "name": Maximum length for peer name is ${MAX_USERNAME_LENGTH}`,
				);
			});
		});
	});

	describe("functionality", () => {
		test("name changes", async ({ ctx }) => {
			// Verifying other peers are not affected
			await insertUserWithSession(ctx);
			const { sessionId } = await insertUserWithSession(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));

			await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ name: faker.person.firstName() }),
			);
		});
	});
});
