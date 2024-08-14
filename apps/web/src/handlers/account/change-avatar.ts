import { TRPCError } from "@trpc/server";
import Sharp from "sharp";

import { avatarFormSchema } from "~app/utils/validation";
import { MAX_AVATAR_BYTESIZE, MAX_AVATAR_SIDE_SIZE } from "~utils/images";
import { authProcedure } from "~web/handlers/trpc";
import { getS3Client } from "~web/providers/s3";

export const S3_AVATAR_PREFIX = "avatars";

const ALLOWED_FORMATS: (keyof Sharp.FormatEnum)[] = ["png", "jpeg", "jpg"];

const validateImage = async (image: Buffer) => {
	const parsedImage = Sharp(image);
	const metadata = await parsedImage.metadata();
	if (!metadata.size || metadata.size > MAX_AVATAR_BYTESIZE) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Maximum bytesize allowed is ${MAX_AVATAR_BYTESIZE}.`,
		});
	}
	if (!metadata.format || !ALLOWED_FORMATS.includes(metadata.format)) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			/* c8 ignore next */
			message: `Format "${metadata.format || "unknown"}" is not allowed.`,
		});
	}
	const maxSizeAllowed = MAX_AVATAR_SIDE_SIZE;
	if (!metadata.height || metadata.height > maxSizeAllowed) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Maximum height allowed is ${maxSizeAllowed}.`,
		});
	}
	if (!metadata.width || metadata.width > maxSizeAllowed) {
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
	return parsedImage.toBuffer();
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
		const validatedImage = await validateImage(
			Buffer.from(await input.avatar.arrayBuffer()),
		);
		const avatarKey = [S3_AVATAR_PREFIX, `${ctx.auth.accountId}.png`].join("/");
		await s3Client.putObject(avatarKey, validatedImage);
		const url = `${[s3Client.endpoint, s3Client.bucket, avatarKey].join(
			"/",
		)}?lastModified=${Date.now()}`;
		await database
			.updateTable("accounts")
			.set({ avatarUrl: url })
			.where("accounts.id", "=", ctx.auth.accountId)
			.executeTakeFirst();
		return { url };
	});
