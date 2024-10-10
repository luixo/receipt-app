import { trpc } from "~app/trpc";
import { MONTH } from "~utils/time";

export const useCurrencies = () =>
	trpc.currency.getList.useQuery({ locale: "en" }, { staleTime: MONTH });
