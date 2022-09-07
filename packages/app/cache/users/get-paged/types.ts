import { TRPCQueryInput, TRPCQueryOutput } from "app/trpc";

export type User = TRPCQueryOutput<"users.getPaged">["items"][number];
export type Input = TRPCQueryInput<"users.getPaged">;
