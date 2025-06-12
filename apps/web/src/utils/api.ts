import { createTRPCClient } from "@trpc/client";

import type { AppRouter } from "~app/trpc";
import { getLinks } from "~app/utils/trpc";
import type { NetContext } from "~web/handlers/context";
import { getLinksParamsFromRequest } from "~web/utils/trpc";

export const getApiTrpcClient = (req: NetContext["req"]) =>
	createTRPCClient<AppRouter>({
		links: getLinks(getLinksParamsFromRequest(req, "api")),
	});
