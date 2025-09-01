import {
	DEFAULT_LIMIT,
	fallback,
	limitSchema as rawLimitSchema,
} from "~app/utils/validation";
import type { RouterContext } from "~web/pages/__root";

export const LIMIT_STORE_NAME = "receipt_limit";

export const limitSchema = rawLimitSchema.or(fallback(() => undefined));

export const withDefaultLimit = (
	currentLimit: number | undefined,
	ctx: RouterContext,
) => {
	const defaultLimit = ctx.initialValues[LIMIT_STORE_NAME];
	return typeof currentLimit === "number"
		? currentLimit
		: defaultLimit || DEFAULT_LIMIT;
};
