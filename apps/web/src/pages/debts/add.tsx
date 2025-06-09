import { z } from "zod/v4";

import { AddDebtScreen } from "~app/features/add-debt/add-debt-screen";
import { getQueryStates } from "~app/hooks/use-navigation";
import { userIdSchema } from "~app/utils/validation";
import type { UsersId } from "~db/models";
import {
	searchParamsWithDefaults,
	stripSearchParams,
} from "~web/utils/navigation";
import { createFileRoute } from "~web/utils/router";

declare module "@react-types/shared" {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface RegisteredParams {
		"/debts/add": z.core.input<typeof schema>;
	}
}

const [schema, defaults] = searchParamsWithDefaults(
	z.object({
		userId: userIdSchema.optional(),
	}),
	{ userId: undefined },
);

const Wrapper = () => {
	const useQueryState = getQueryStates(Route);
	return <AddDebtScreen userIdState={useQueryState("userId")} />;
};

const Route = createFileRoute("/_protected/debts/add")<{
	userId: UsersId | undefined;
}>({
	component: Wrapper,
	head: () => ({ meta: [{ title: "RA - Add debt" }] }),
	validateSearch: schema,
	search: { middlewares: [stripSearchParams(defaults)] },
});

export default Route.Screen;
