import { createFileRoute } from "@tanstack/react-router";

const Wrapper = () => null;

export const Route = createFileRoute(
	"/_protected/debts/user/$id/exchange/specific",
)({
	component: Wrapper,
	head: () => ({ meta: [{ title: "RA - Exchange specific user debts" }] }),
});
