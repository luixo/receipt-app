export const rotate = <T>(array: T[], by: number): T[] => {
	const byConstrained = by % array.length;
	return array
		.slice(byConstrained, array.length)
		.concat(array.slice(0, byConstrained));
};
