import Sharp from "sharp";
import { assert, describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import { insertAccountWithSession } from "~tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { MAX_AVATAR_BYTESIZE, MAX_AVATAR_SIDE_SIZE } from "~utils/images";
import { t } from "~web/handlers/trpc";

import { S3_AVATAR_PREFIX, procedure } from "./change-avatar";

const createCaller = t.createCallerFactory(t.router({ procedure }));

const getFormData = (bits?: BlobPart[]) => {
	const formData = new FormData();
	if (bits) {
		formData.append("avatar", new File(bits, "avatar.png"));
	}
	return formData;
};

type FormImageOptions = {
	exif?: Record<string, unknown>;
	format?: "png" | "jpeg" | "webp";
	type?: "static" | "noise";
};
const defaultSettings: FormImageOptions = {
	format: "png",
};

const generateFormWithImage = async (
	width: number,
	height: number,
	{ exif, format = "png", type = "static" }: FormImageOptions = defaultSettings,
) => {
	let image = Sharp({
		create: {
			width,
			height,
			channels: 4,
			background: { r: 255, g: 0, b: 0, alpha: 0.5 },
			noise:
				type === "noise"
					? {
							type: "gaussian" as const,
							mean: 128,
							sigma: 30,
						}
					: undefined,
		},
	});
	image = image[format]();
	if (exif) {
		image = image.withMetadata({ exif });
	}
	const buffer = await image.toBuffer();
	return getFormData([buffer]);
};

describe("account.changeAvatar", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure(getFormData([])),
		);

		describe("avatar", () => {
			test("is too big in bytes", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					async () =>
						caller.procedure(
							await generateFormWithImage(
								MAX_AVATAR_SIDE_SIZE * 3,
								MAX_AVATAR_SIDE_SIZE * 3,
								{ type: "noise" },
							),
						),
					"BAD_REQUEST",
					`Maximum bytesize allowed is ${MAX_AVATAR_BYTESIZE}.`,
				);
			});

			test("is too tall", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					async () =>
						caller.procedure(
							await generateFormWithImage(
								MAX_AVATAR_SIDE_SIZE,
								MAX_AVATAR_SIDE_SIZE + 1,
							),
						),
					"BAD_REQUEST",
					`Maximum height allowed is ${MAX_AVATAR_SIDE_SIZE}.`,
				);
			});

			test("is too wide", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					async () =>
						caller.procedure(
							await generateFormWithImage(
								MAX_AVATAR_SIDE_SIZE + 1,
								MAX_AVATAR_SIDE_SIZE,
							),
						),
					"BAD_REQUEST",
					`Maximum width allowed is ${MAX_AVATAR_SIDE_SIZE}.`,
				);
			});

			test("is not square", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					async () =>
						caller.procedure(
							await generateFormWithImage(
								MAX_AVATAR_SIDE_SIZE,
								MAX_AVATAR_SIDE_SIZE - 1,
							),
						),
					"BAD_REQUEST",
					`Expected to have equal height and width, got ${MAX_AVATAR_SIDE_SIZE}x${
						MAX_AVATAR_SIDE_SIZE - 1
					}.`,
				);
			});

			test("is not of allowed format", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					async () =>
						caller.procedure(
							await generateFormWithImage(
								MAX_AVATAR_SIDE_SIZE,
								MAX_AVATAR_SIDE_SIZE,
								{ format: "webp" },
							),
						),
					"BAD_REQUEST",
					`Format "webp" is not allowed.`,
				);
			});
		});

		test("provider broken", async ({ ctx }) => {
			ctx.s3Options.broken = true;
			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = createCaller(await createAuthContext(ctx, sessionId));
			await expectTRPCError(
				async () =>
					caller.procedure(
						await generateFormWithImage(
							MAX_AVATAR_SIDE_SIZE,
							MAX_AVATAR_SIDE_SIZE,
						),
					),
				"INTERNAL_SERVER_ERROR",
				"Test context broke s3 service error",
			);
		});
	});

	describe("functionality", () => {
		test("avatar changes to null", async ({ ctx }) => {
			// Verifying other users are not affected
			await insertAccountWithSession(ctx);
			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = createCaller(await createAuthContext(ctx, sessionId));

			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure(getFormData()),
			);
			expect(result).toBeUndefined();
			expect(ctx.s3Options.mock.getMessages()).toHaveLength(0);
		});

		test("avatar changes to a given image", async ({ ctx }) => {
			// Verifying other users are not affected
			await insertAccountWithSession(ctx);
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const caller = createCaller(await createAuthContext(ctx, sessionId));

			const result = await expectDatabaseDiffSnapshot(ctx, async () =>
				caller.procedure(
					await generateFormWithImage(
						MAX_AVATAR_SIDE_SIZE,
						MAX_AVATAR_SIDE_SIZE,
					),
				),
			);
			const key = [S3_AVATAR_PREFIX, `${accountId}.png`].join("/");
			const url = `${[
				ctx.s3Options.mock.endpoint,
				ctx.s3Options.mock.bucket,
				key,
			].join(
				"/",
				// eslint-disable-next-line no-restricted-syntax
			)}?lastModified=${Date.now()}`;
			expect(result).toEqual({ url });
			expect(ctx.s3Options.mock.getMessages()).toHaveLength(1);
			const message = ctx.s3Options.mock.getMessages()[0];
			assert(message);
			expect(message.objectLength).toBeGreaterThan(1000);
			expect(message.objectLength).toBeLessThan(5000);
			expect(message).toStrictEqual<typeof message>({
				key,
				objectLength: message.objectLength,
			});
		});

		test("metadata is stripped", async ({ ctx }) => {
			// Verifying other users are not affected
			await insertAccountWithSession(ctx);
			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = createCaller(await createAuthContext(ctx, sessionId));

			await caller.procedure(
				await generateFormWithImage(MAX_AVATAR_SIDE_SIZE, MAX_AVATAR_SIDE_SIZE),
			);
			await caller.procedure(
				await generateFormWithImage(
					MAX_AVATAR_SIDE_SIZE,
					MAX_AVATAR_SIDE_SIZE,
					{ exif: { IFD0: { Copyright: "Anything" } } },
				),
			);
			const getObjectLength = (index: number) => {
				const message = ctx.s3Options.mock.getMessages()[index];
				assert(message);
				return message.objectLength;
			};
			expect(getObjectLength(0)).toEqual(getObjectLength(1));
		});
	});
});
