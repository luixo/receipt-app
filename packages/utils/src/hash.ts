export const getIndexByString = (input: string) =>
	input.split("").reduce((acc, char) => acc + (char.codePointAt(0) || 0), 0);
