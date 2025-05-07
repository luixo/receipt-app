export const getDuplicates = <T, K extends string | string[]>(
	array: readonly T[],
	getKey: (item: T) => K,
) => {
	const items = array.map(getKey);
	const map = new Map<string, { count: number; value: K }>();
	for (const item of items) {
		const key = Array.isArray(item) ? item.join("|") : String(item);
		const prevMapElement = map.get(key) || {
			count: 0,
			value: item,
		};
		map.set(key, {
			count: prevMapElement.count + 1,
			value: prevMapElement.value,
		});
	}
	return [...map.values()]
		.filter(({ count }) => count !== 1)
		.map(({ value, count }) => [value, count] as const);
};
