import { trpc } from "app/trpc";

export const useSelfAccountId = () => {
	const query = trpc.account.get.useQuery();
	return query.data?.account.id;
};
