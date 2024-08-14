import type {
	Redis,
	UpstashRequest,
	UpstashResponse,
} from "@upstash/redis/nodejs";

import type { KeysMatching } from "~utils/types";
import type { CacheDbOptions } from "~web/providers/cache-db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RedisFunctionKey = KeysMatching<Redis, (...args: any) => any>;

type Message = [string, unknown[], UpstashResponse<unknown>];
export type CacheDbOptionsMock = CacheDbOptions & {
	broken: boolean;
	mock: CacheDbOptions["mock"] & {
		setResponder: <T extends RedisFunctionKey>(
			method: T,
			responder: (...args: Parameters<Redis[T]>) => ReturnType<Redis[T]>,
		) => void;
		getMessages: () => Message[];
	};
};
export const getCacheDbOptions = (): CacheDbOptionsMock => {
	const messages: Message[] = [];
	const responders: Record<
		string,
		(
			...args: Parameters<Redis[RedisFunctionKey]>
		) => ReturnType<Redis[RedisFunctionKey]>
	> = {};
	let innerBroken = false;
	responders.ping = async () => "pong";
	return {
		get broken() {
			return innerBroken;
		},
		set broken(value) {
			innerBroken = value;
		},
		mock: {
			request: async <T>(req: UpstashRequest) => {
				if (innerBroken) {
					throw new Error("Test context broke cache db service error");
				}
				const [method, ...values] = req.body as [string, ...unknown[]];
				const responder = responders[method];
				if (responder) {
					let returnValue: UpstashResponse<T>;
					try {
						returnValue = {
							result: (await responder(
								...(values as Parameters<typeof responder>),
							)) as T,
						};
					} catch (error) {
						returnValue = { error: String(error) };
					}
					messages.push([method, values, returnValue]);
					return returnValue;
				}
				throw new Error(`Expected to have responder for "${method}" method`);
			},
			setResponder: (method, responder) => {
				responders[method] =
					responder as unknown as (typeof responders)[typeof method];
			},
			getMessages: () => messages,
		},
	};
};
