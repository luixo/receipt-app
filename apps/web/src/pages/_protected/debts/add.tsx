import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod/v4";

import { AddDebtScreen } from "~app/features/add-debt/add-debt-screen";
import { getQueryStates } from "~app/hooks/use-navigation";
import { userIdSchema } from "~app/utils/validation";
import { searchParamsWithDefaults } from "~web/utils/navigation";

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

export const Route = createFileRoute("/_protected/debts/add")({
	component: Wrapper,
	head: () => ({ meta: [{ title: "RA - Add debt" }] }),
	validateSearch: zodValidator({ schema, output: "input" }),
	search: { middlewares: [stripSearchParams(defaults)] },
});
