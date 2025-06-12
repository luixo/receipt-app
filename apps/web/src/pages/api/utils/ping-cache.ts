import { getApiTrpcClient } from "~web/utils/api";
import { createHandler } from "~web/utils/net";

const handler = createHandler(
	async (req) => {
		const client = getApiTrpcClient(req);
		try {
			await Promise.all([client.utils.pingCache.mutate()]);
			return `Cache ping successful`;
		} catch (e) {
			throw new Error(`Error on cache ping: ${String(e)}`);
		}
	},
	{
		allowedMethods: ["POST"],
	},
);

export default handler;
