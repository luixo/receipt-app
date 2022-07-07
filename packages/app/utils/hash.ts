export const getIndexByString = (input: string) => {
	return input.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
};
