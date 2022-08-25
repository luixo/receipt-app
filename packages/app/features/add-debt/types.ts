import { Direction } from "app/components/app/sign-button-group";
import { TRPCInfiniteQueryOutput, TRPCQueryOutput } from "app/trpc";

export type Form = {
	amount: number;
	direction: Direction;
	currency: TRPCQueryOutput<"currency.get-list">["list"][number];
	user: TRPCInfiniteQueryOutput<"users.get-paged">["items"][number];
	note: string;
	timestamp: Date;
};
