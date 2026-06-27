import * as aws from "@aws-sdk/client-s3";

import { env } from "~utils/env";
import type { UnauthorizedContext } from "~web/handlers/context";

export type S3Options = {
	mock?: S3Client;
};

type S3Client = {
	putObject: (key: string, object: Buffer) => Promise<void>;
	bucket: string;
	endpoint: string;
};

let s3Client: S3Client | undefined;

export const getS3Client = (ctx: UnauthorizedContext): S3Client => {
	if (ctx.s3Options.mock) {
		return ctx.s3Options.mock;
	}
	if (s3Client) {
		return s3Client;
	}
	const { S3_BUCKET, S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_KEY } =
		env;

	const client = new aws.S3Client({
		endpoint: S3_ENDPOINT,
		region: S3_REGION,
		credentials: {
			accessKeyId: S3_ACCESS_KEY_ID,
			secretAccessKey: S3_SECRET_KEY,
		},
	});
	s3Client = {
		putObject: async (key, object) => {
			const command = new aws.PutObjectCommand({
				Bucket: S3_BUCKET,
				Key: key,
				Body: object,
				CacheControl: "max-age=86400",
			});
			await client.send(command);
		},
		bucket: S3_BUCKET,
		endpoint: S3_ENDPOINT,
	};
	return s3Client;
};
