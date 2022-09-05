import { TRPCQueryOutput } from "app/trpc";

export type Currency = TRPCQueryOutput<"currency.getList">["list"][number];

export type Form = {
	name: string;
	currency: Currency;
	issued: Date;
};
