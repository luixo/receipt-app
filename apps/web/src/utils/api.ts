import { createTRPCClient } from "@trpc/client";
import type { AnyRouter } from "@trpc/server/unstable-core-do-not-import";

import { getLinks } from "~app/utils/trpc";
import { getLinksParamsFromRequest } from "~web/utils/trpc";

export const getApiTrpcClient = <R extends AnyRouter>(req: Request) =>
	createTRPCClient<R>({
		links: getLinks(
			getLinksParamsFromRequest({ type: "server", request: req }, "api"),
		),
	});
