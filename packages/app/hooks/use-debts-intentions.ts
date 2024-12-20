import { trpc } from "~app/trpc";

export const useDebtsIntentions = () => {
	const intentions = trpc.debtIntentions.getAll.useQuery(undefined, {
		trpc: { ssr: false },
	});
	return intentions.status === "success" ? intentions.data.length : 0;
};
