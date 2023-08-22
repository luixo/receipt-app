import type { TRPCQueryOutput } from "app/trpc";

export type Currency = TRPCQueryOutput<"currency.getList">[number];

export type Form = {
	name: string;
	currency: Currency;
	issued: Date;
};
