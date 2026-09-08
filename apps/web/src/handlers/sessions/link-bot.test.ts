import * as crypto from "node:crypto";
import { entries } from "remeda";
import { describe, expect, vi } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	assertDatabase,
	insertAccountWithSession,
} from "~tests/backend/utils/data";
import { expectTRPCError } from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { getNow, toDate } from "~utils/date";
import { t } from "~web/handlers/trpc";
import { env } from "~web/utils/env";

const { TEST_BOT_TOKEN } = vi.hoisted(() => ({
	TEST_BOT_TOKEN: "test-bot-token",
}));

vi.mock(import("~web/utils/env"), async (importOriginal) => {
	const original = await importOriginal();
	return {
		...original,
		env: { ...original.env, TELEGRAM_BOT_TOKEN: TEST_BOT_TOKEN },
	};
});

const { procedure } = await import("./link-bot");

const createCaller = t.createCallerFactory(t.router({ procedure }));

const buildInitData = (
	fields: Record<string, string>,
	{ botToken = TEST_BOT_TOKEN }: { botToken?: string } = {},
) => {
	const dataCheckString = entries(fields)
		.toSorted(([a], [b]) => a.localeCompare(b))
		.map(([key, value]) => `${key}=${value}`)
		.join("\n");
	const secretKey = crypto
		.createHmac("sha256", "WebAppData")
		.update(botToken)
		.digest();
	const hash = crypto
		.createHmac("sha256", secretKey)
		.update(dataCheckString)
		.digest("hex");
	return new URLSearchParams({ ...fields, hash }).toString();
};

const validFields = () => ({
	auth_date: String(
		Math.floor(toDate.zonedDateTime(getNow.zonedDateTime()).getTime() / 1000),
	),
	user: JSON.stringify({ id: 123_456_789 }),
});

describe("sessions.linkBot", () => {
	describe("functionality", () => {
		test("bot token not configured", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const mutableEnv = env as { TELEGRAM_BOT_TOKEN?: string };
			mutableEnv.TELEGRAM_BOT_TOKEN = undefined;
			try {
				await expectTRPCError(
					() => caller.procedure({ initData: "" }),
					"FORBIDDEN",
					"Bot linking is not configured.",
				);
			} finally {
				mutableEnv.TELEGRAM_BOT_TOKEN = TEST_BOT_TOKEN;
			}
		});

		test("invalid signature", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const initData = buildInitData(validFields(), { botToken: "wrong" });
			await expectTRPCError(
				() => caller.procedure({ initData }),
				"UNAUTHORIZED",
				"Invalid Telegram data.",
			);
		});

		test("bot user id is linked", async ({ ctx }) => {
			const { accountId, sessionId } = await insertAccountWithSession(ctx);
			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const initData = buildInitData(validFields());
			await caller.procedure({ initData });
			const database = assertDatabase(ctx);
			const session = await database
				.selectFrom("sessions")
				.where("accountId", "=", accountId)
				.where("botUserId", "is not", null)
				.select("botUserId")
				.executeTakeFirstOrThrow();
			expect(session.botUserId).toBe("tg:123456789");
		});
	});
});
