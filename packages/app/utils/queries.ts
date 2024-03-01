export const TRPC_ENDPOINT = "/api/trpc";

export const getSsrHost = (serverPort: number) => {
	const host = process.env.VERCEL_URL || `localhost:${serverPort}`;
	const secure = Boolean(process.env.VERCEL_URL);
	return `http${secure ? "s" : ""}://${host}${TRPC_ENDPOINT}`;
};
