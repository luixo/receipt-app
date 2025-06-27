export const getHostUrl = (url: string) => {
	const urlObject = new URL(url);
	return `${urlObject.protocol}//${urlObject.host}/`;
};
