import { TRPCQueryOutput } from "app/trpc";

export type Form = {
	name: string;
	currency: TRPCQueryOutput<"currency.get-list">["list"][number];
};
