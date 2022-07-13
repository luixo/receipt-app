import { MiddlewareFunction } from "@trpc/server/dist/declarations/src/internals/middlewares";

import { UnauthorizedContext } from "next-app/handlers/context";

export const middleware: MiddlewareFunction<
	UnauthorizedContext,
	UnauthorizedContext,
	unknown
> = async ({ path, type, next }) => {
	const start = Date.now();
	const result = await next();
	const duration = Date.now() - start;
	const options = {
		path,
		type,
		durationMs: duration,
	};
	if (result.ok) {
		result.ctx.logger.trace(options, "OK request timing:");
	} else {
		result.ctx.logger.trace(options, "Non-OK request timing");
	}

	return result;
};
