export const round = (input: number, digits = 2) => {
	const decimalPower = 10 ** digits;
	return Math.floor(input * decimalPower) / decimalPower;
};
