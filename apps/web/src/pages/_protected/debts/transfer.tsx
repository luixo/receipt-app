import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { DebtsTransferScreen } from "~app/features/debts-transfer/debts-transfer-screen";
import { getQueryStates } from "~app/hooks/use-navigation";
import { getTitle, loadNamespaces } from "~app/utils/i18n";
import { userIdSchema } from "~app/utils/validation";
import { searchParamsWithDefaults } from "~web/utils/navigation";

const [schema, defaults] = searchParamsWithDefaults(
	z.object({
		to: userIdSchema.optional(),
		from: userIdSchema.optional(),
	}),
	{ to: undefined, from: undefined },
);
const Wrapper = () => {
	const useQueryState = getQueryStates(Route);
	return (
		<DebtsTransferScreen
			fromIdState={useQueryState("from")}
			toIdState={useQueryState("to")}
		/>
	);
};

export const Route = createFileRoute("/_protected/debts/transfer")({
	component: Wrapper,
	validateSearch: zodValidator({ schema, output: "input" }),
	search: { middlewares: [stripSearchParams(defaults)] },
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "debts");
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context, "transferDebts") }],
	}),
});
