export const getHostUrl = (url: string) => {
	const urlObject = new URL(url);
	return `${urlObject.protocol}//${urlObject.host}/`;
};

/* c8 ignore start */
/* oxlint-disable node/no-process-env */
// see https://github.com/openchamber/openchamber/issues/4312
export const getServerHostUrl = (url: string) => {
	const parsed = new URL(url);
	const isOpenCode =
		import.meta.env.MODE !== "test" && Boolean(process.env.OPENCODE);
	const port = process.env.PORT;
	if (
		isOpenCode &&
		port &&
		parsed.port !== port &&
		["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)
	) {
		parsed.port = port;
	}
	return getHostUrl(parsed.toString());
};
/* oxlint-enable node/no-process-env */
/* c8 ignore stop */
