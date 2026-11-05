export const getHostUrl = (url: string) => {
	const urlObject = new URL(url);
	return `${urlObject.protocol}//${urlObject.host}/`;
};

/* oxlint-disable node/no-process-env */
// see https://github.com/openchamber/openchamber/issues/4312
export const getServerHostUrl = (request: Request) => {
	const parsed = new URL(request.url);
	// The reverse proxy must overwrite this header before forwarding requests.
	const protocol = request.headers.get("x-forwarded-proto");
	if (protocol === "http" || protocol === "https") {
		parsed.protocol = `${protocol}:`;
	}
	/* c8 ignore start */
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
	/* c8 ignore stop */
	return getHostUrl(parsed.toString());
};
/* oxlint-enable node/no-process-env */
