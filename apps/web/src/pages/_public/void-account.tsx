import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod/v4";

import { VoidAccountScreen } from "~app/features/void-account/void-account-screen";
import { voidAccountTokenSchema } from "~app/utils/validation";

const Wrapper = () => {
	const { token } = Route.useSearch();
	return <VoidAccountScreen token={token} />;
};

export const Route = createFileRoute("/_public/void-account")({
	component: Wrapper,
	head: () => ({ meta: [{ title: "RA - Void account" }] }),
	validateSearch: zodValidator(
		z.object({ token: voidAccountTokenSchema.optional() }),
	),
});
