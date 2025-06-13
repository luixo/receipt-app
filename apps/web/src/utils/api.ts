import { createTRPCClient } from "@trpc/client";

import type { AppRouter } from "~app/trpc";
import { getLinks } from "~app/utils/trpc";
import { getLinksParamsFromRequest } from "~web/utils/trpc";

export const getApiTrpcClient = (req: Request) =>
	createTRPCClient<AppRouter>({
		links: getLinks(
			getLinksParamsFromRequest({ type: "server", request: req }, "api"),
		),
	});
