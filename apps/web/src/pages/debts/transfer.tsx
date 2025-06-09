import { z } from "zod/v4";

import { DebtsTransferScreen } from "~app/features/debts-transfer/debts-transfer-screen";
import { getQueryStates } from "~app/hooks/use-navigation";
import { userIdSchema } from "~app/utils/validation";
import {
	searchParamsWithDefaults,
	stripSearchParams,
} from "~web/utils/navigation";
import { createFileRoute } from "~web/utils/router";

declare module "@react-types/shared" {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface RegisteredParams {
		"/debts/transfer": z.core.input<typeof schema>;
	}
}

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

const Route = createFileRoute("/_protected/debts/transfer")({
	component: Wrapper,
	head: () => ({ meta: [{ title: "RA - Transfer debt" }] }),
	validateSearch: schema,
	search: { middlewares: [stripSearchParams(defaults)] },
});

export default Route.Screen;
