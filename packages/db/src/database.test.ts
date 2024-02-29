import { sql } from "kysely";
import { describe, expect } from "vitest";

import { test } from "~tests/backend/utils/test";

describe("database", () => {
	test("SQL error logger works", async ({ ctx }) => {
		await expect(() => sql`SELECT foo`.execute(ctx.database)).rejects.toThrow();
		const loggedMessages = ctx.logger.getMessages();
		await expect(loggedMessages).toHaveLength(1);
		await expect(loggedMessages[0]!).toHaveLength(1);
		await expect(loggedMessages[0]![0]!).toHaveProperty("duration");
		type MessageType = { duration: number; sql: string; error: Error };
		const typedMessage = loggedMessages[0]![0] as MessageType;
		await expect(typedMessage.duration).toBeTypeOf("number");
		await expect(typedMessage.error.toString()).toBe(
			'error: column "foo" does not exist',
		);
		await expect(typedMessage).toStrictEqual<typeof typedMessage>({
			duration: typedMessage.duration,
			error: typedMessage.error,
			sql: "SELECT foo",
		});
	});
});
