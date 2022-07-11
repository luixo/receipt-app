export const getIndexByString = (input: string) =>
	input.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
