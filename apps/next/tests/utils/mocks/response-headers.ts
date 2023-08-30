type HeaderValue = number | string | ReadonlyArray<string>;
export type HeaderTuple = [name: string, value: HeaderValue];

export type ResponseHeadersMock = {
	add: (...tuple: HeaderTuple) => void;
	get: () => HeaderTuple[];
};
export const getResponseHeaders = (): ResponseHeadersMock => {
	const tuples: HeaderTuple[] = [];
	return {
		add: (...tuple) => {
			tuples.push(tuple);
		},
		get: () => tuples,
	};
};
