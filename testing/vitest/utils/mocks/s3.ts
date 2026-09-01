import type { S3Options } from "~web/providers/s3";

type InterceptedMessage = { key: string; objectLength: number };

export type S3OptionsMock = S3Options & {
	setBroken: (next: boolean) => void;
	mock: S3Options["mock"] & {
		getMessages: () => InterceptedMessage[];
	};
};
export const getS3Options = (): S3OptionsMock => {
	let innerBroken = false;
	const messages: InterceptedMessage[] = [];
	return {
		setBroken: (next: boolean) => {
			innerBroken = next;
		},
		mock: {
			putObject: (key, object) => {
				if (innerBroken) {
					throw new Error("Test context broke s3 service error");
				}
				messages.push({ key, objectLength: object.length });
				return Promise.resolve();
			},
			bucket: "test-bucket",
			endpoint: "https://fake-endpoint.org",
			getMessages: () => messages,
		},
	};
};
