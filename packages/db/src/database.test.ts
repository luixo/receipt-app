import { sql } from "kysely";
import { assert, describe, expect } from "vitest";

import { assertDatabase } from "~tests/backend/utils/data";
import { test } from "~tests/backend/utils/test";

describe("database", () => {
	test("SQL error logger works", async ({ ctx }) => {
		const database = assertDatabase(ctx);
		await expect(() => sql`SELECT foo`.execute(database)).rejects.toThrow();
		const loggedMessages = ctx.logger.getMessages();
		expect(loggedMessages).toHaveLength(1);
		assert(loggedMessages[0]);
		expect(loggedMessages[0]).toHaveLength(1);
		assert(loggedMessages[0][0]);
		expect(loggedMessages[0][0]).toHaveProperty("duration");
		type MessageType = { duration: number; sql: string; error: Error };
		const typedMessage = loggedMessages[0][0] as MessageType;
		expect(typedMessage.duration).toBeTypeOf("number");
		expect(typedMessage.error.toString()).toBe(
			'error: column "foo" does not exist',
		);
		expect(typedMessage).toStrictEqual<typeof typedMessage>({
			duration: typedMessage.duration,
			error: typedMessage.error,
			sql: "SELECT foo",
		});
	});
});
