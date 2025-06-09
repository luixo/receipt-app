import { z } from "zod/v4";

import { VoidAccountScreen } from "~app/features/void-account/void-account-screen";
import { confirmEmailTokenSchema } from "~web/handlers/validation";
import { createFileRoute } from "~web/utils/router";

const Wrapper = () => {
	const { token } = Route.useSearch();
	return <VoidAccountScreen token={token} />;
};

const Route = createFileRoute("/_public/void-account")({
	component: Wrapper,
	head: () => ({ meta: [{ title: "RA - Void account" }] }),
	validateSearch: z.object({ token: confirmEmailTokenSchema.optional() }),
});

export default Route.Screen;
