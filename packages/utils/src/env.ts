import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	skipValidation: Boolean(process.env.PLAYWRIGHT),
	server: {
		DATABASE_URL: z.url(),
		CACHE_DATABASE_URL: z.url(),
		ERA_API_KEY: z.string(),
		EMAIL_SERVICE_ACTIVE: z.coerce.boolean().catch(false),
		PLAYWRIGHT: z.coerce.boolean().catch(false),
		BASE_URL: z.url().optional(),
		MAILER_SENDER: z.string().optional(),
		MAILER_TOKEN: z.string().optional(),
		VERCEL: z.coerce.boolean().catch(false),
		S3_BUCKET: z.string(),
		S3_ENDPOINT: z.url(),
		S3_REGION: z.string(),
		S3_ACCESS_KEY_ID: z.string(),
		S3_SECRET_KEY: z.string(),
	},
	clientPrefix: "VITE_",
	client: {},
	// This is the only place it can be used
	// eslint-disable-next-line node/no-process-env
	runtimeEnv: process.env,
});
