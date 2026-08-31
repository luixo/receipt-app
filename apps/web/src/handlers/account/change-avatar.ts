import { TRPCError } from "@trpc/server";
import { imageSize } from "image-size";

import { avatarFormSchema } from "~app/utils/validation";
import { MAX_AVATAR_BYTESIZE, MAX_AVATAR_SIDE_SIZE } from "~utils/images";
import { authProcedure } from "~web/handlers/trpc";
import { getS3Client } from "~web/providers/s3";

export const S3_AVATAR_PREFIX = "avatars";

const ALLOWED_FORMATS = new Set(["png", "jpg"]);

const validateImage = (image: Buffer) => {
	if (image.byteLength > MAX_AVATAR_BYTESIZE) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Maximum bytesize allowed is ${MAX_AVATAR_BYTESIZE}.`,
		});
	}
	const metadata = imageSize(image);
	if (!metadata.type || !ALLOWED_FORMATS.has(metadata.type)) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			/* c8 ignore next */
			message: `Format "${metadata.type || "unknown"}" is not allowed.`,
		});
	}
	const maxSizeAllowed = MAX_AVATAR_SIDE_SIZE;
	if (metadata.height > maxSizeAllowed) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Maximum height allowed is ${maxSizeAllowed}.`,
		});
	}
	if (metadata.width > maxSizeAllowed) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Maximum width allowed is ${maxSizeAllowed}.`,
		});
	}
	if (metadata.width !== metadata.height) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Expected to have equal height and width, got ${metadata.width}x${metadata.height}.`,
		});
	}
	return image;
};

export const procedure = authProcedure
	.input(avatarFormSchema)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		if (!input.avatar) {
			await database
				.updateTable("accounts")
				.set({ avatarUrl: null })
				.where("accounts.id", "=", ctx.auth.accountId)
				.executeTakeFirst();
			return;
		}
		const s3Client = getS3Client(ctx);
		const validatedImage = validateImage(
			Buffer.from(await input.avatar.arrayBuffer()),
		);
		const avatarKey = [S3_AVATAR_PREFIX, `${ctx.auth.accountId}.png`].join("/");
		await s3Client.putObject(avatarKey, validatedImage);
		const url = `${[s3Client.endpoint, s3Client.bucket, avatarKey].join(
			"/",
			// oxlint-disable-next-line eslint-js/no-restricted-syntax
		)}?lastModified=${Date.now()}`;
		await database
			.updateTable("accounts")
			.set({ avatarUrl: url })
			.where("accounts.id", "=", ctx.auth.accountId)
			.executeTakeFirst();
		return { url };
	});
