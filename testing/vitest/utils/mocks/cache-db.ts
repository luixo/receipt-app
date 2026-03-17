import type { KeysMatching } from "~utils/types";
import type { CacheDbOptions, CacheInstance } from "~web/providers/cache-db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CacheFunctionKey = KeysMatching<CacheInstance, (...args: any) => any>;

type Message = [string, unknown[], object];
export type CacheDbOptionsMock = CacheDbOptions & {
	broken: boolean;
	mock: CacheDbOptions["mock"] & {
		setResponder: <T extends CacheFunctionKey>(
			method: T,
			responder: (
				...args: Parameters<CacheInstance[T]>
			) => ReturnType<CacheInstance[T]>,
		) => void;
		getMessages: () => Message[];
	};
};
export const getCacheDbOptions = (): CacheDbOptionsMock => {
	const messages: Message[] = [];
	const responders: Partial<{
		[K in CacheFunctionKey]: (
			...args: Parameters<CacheInstance[K]>
		) => ReturnType<CacheInstance[K]>;
	}> = {};
	let innerBroken = false;
	const requester =
		<K extends CacheFunctionKey>(key: K) =>
		async (
			...args: Parameters<CacheInstance[K]>
		): Promise<Awaited<ReturnType<CacheInstance[K]>>> => {
			if (innerBroken) {
				throw new Error("Test context broke cache db service error");
			}
			const responder = responders[key];
			if (responder) {
				try {
					const result = await responder(...args);
					messages.push([key, args, { result }]);
					return result;
				} catch (error) {
					messages.push([key, args, { error: String(error) }]);
					throw error;
				}
			}
			throw new Error(`Expected to have responder for "${key}" method`);
		};
	return {
		get broken() {
			return innerBroken;
		},
		set broken(value) {
			innerBroken = value;
		},
		mock: {
			getValue: requester("getValue"),
			setValue: requester("setValue"),
			setResponder: (method, responder) => {
				responders[method] =
					responder as unknown as (typeof responders)[typeof method];
			},
			getMessages: () => messages,
		},
	};
};
