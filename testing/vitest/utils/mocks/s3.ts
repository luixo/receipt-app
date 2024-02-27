import type { S3Options } from "~web/providers/s3";

type InterceptedMessage = { key: string; objectLength: number };

export type S3OptionsMock = S3Options & {
	broken: boolean;
	mock: S3Options["mock"] & {
		getMessages: () => InterceptedMessage[];
	};
};
export const getS3Options = (): S3OptionsMock => {
	let innerBroken = false;
	const messages: InterceptedMessage[] = [];
	return {
		get broken() {
			return innerBroken;
		},
		set broken(value) {
			innerBroken = value;
		},
		mock: {
			putObject: async (key, object) => {
				if (innerBroken) {
					throw new Error("Test context broke s3 service error");
				}
				messages.push({ key, objectLength: object.length });
			},
			bucket: "test-bucket",
			endpoint: "https://fake-endpoint.org",
			getMessages: () => messages,
		},
	};
};
