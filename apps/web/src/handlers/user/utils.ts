import type { UserId } from "~db/ids";
import { env } from "~web/utils/env";

export const S3_AVATAR_PREFIX = "avatars";

export const getAvatarUrl = (
	userId: UserId,
	avatarTimestamp: Temporal.ZonedDateTime | null,
) => {
	if (avatarTimestamp === null) {
		return undefined;
	}
	return `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${S3_AVATAR_PREFIX}/${userId}.png?lastModified=${avatarTimestamp.epochMilliseconds}`;
};
